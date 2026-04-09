#!/usr/bin/env python3
"""
PS4 Remote Control CLI
Connects via WebSocket (legacy JS inject) AND provides HTTP commands
to the remote-control.ts panel running on the PS4.
"""

import argparse
import asyncio
import json
import pathlib
import readline
import urllib.parse
import urllib.request
from datetime import datetime, timezone

import websockets

# ── argument parsing ──────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="PS4 Remote Control / WebSocket client")
parser.add_argument("ip", help="IP address of the PS4")
parser.add_argument("-p", "--port",    type=int, default=40404, help="WebSocket port (default: 40404)")
parser.add_argument("-r", "--rc-port", type=int, default=0,     help="remote-control HTTP port (0 = not set)")
parser.add_argument("-d", "--delay",   type=int, default=2,     help="Reconnect delay in seconds (default: 2)")

args    = parser.parse_args()
IP      = args.ip
WS_PORT = args.port
RC_PORT = args.rc_port
DELAY   = args.delay
RETRY   = True

LOG_FILE       = f"logs_{datetime.now(timezone.utc).strftime('%Y-%m-%d_%H-%M-%S')}_utc.txt"
CURRENT_ATTEMPT = 1
IS_NEW_ATTEMPT  = True
ATTEMPT_START   = None

try:
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        f.write("note:\n\n")
except Exception as e:
    print(f"[!] Failed to create log file: {e}")


# ── logging ───────────────────────────────────────────────────────────────────
def log_print(message: str) -> None:
    global CURRENT_ATTEMPT, IS_NEW_ATTEMPT, ATTEMPT_START

    ts    = datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3]
    entry = f"[{ts}] {message}"
    print(entry)

    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            if IS_NEW_ATTEMPT:
                f.write(f"attempt {CURRENT_ATTEMPT}:\n")
                ATTEMPT_START  = datetime.now(timezone.utc)
                IS_NEW_ATTEMPT = False
            f.write(entry + "\n")
            if "Disconnected" in message:
                if ATTEMPT_START:
                    f.write(f"Time Taken: {datetime.now(timezone.utc) - ATTEMPT_START}\n")
                f.write("\n")
                CURRENT_ATTEMPT += 1
                IS_NEW_ATTEMPT   = True
    except Exception:
        pass


# ── HTTP helpers for remote-control panel ─────────────────────────────────────
def _rc_url(path: str) -> str | None:
    if not RC_PORT:
        print("  [!] --rc-port not set. Run with -r <port> to enable HTTP commands.")
        return None
    return f"http://{IP}:{RC_PORT}{path}"


def _rc_get(path: str) -> dict | None:
    url = _rc_url(path)
    if not url:
        return None
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"  [!] HTTP GET {path} → {e}")
        return None


def _rc_post(path: str, body: str) -> dict | None:
    url = _rc_url(path)
    if not url:
        return None
    try:
        req = urllib.request.Request(url, data=body.encode(), method="POST")
        req.add_header("Content-Type", "text/plain")
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"  [!] HTTP POST {path} → {e}")
        return None


# ── remote-control commands ───────────────────────────────────────────────────
def cmd_exec(code: str) -> None:
    """Evaluate JavaScript on the PS4 and print the result."""
    d = _rc_post("/exec", code)
    if d is None:
        return
    if d.get("ok"):
        print(f"  ← {d.get('result', '')}")
    else:
        print(f"  ✗ {d.get('error', 'unknown error')}")


def cmd_ls(path: str = "/") -> None:
    """List a directory on the PS4 filesystem."""
    d = _rc_get(f"/ls?path={urllib.parse.quote(path)}")
    if d is None:
        return
    if "error" in d:
        print(f"  Error: {d['error']}")
        return
    entries = d.get("entries", [])
    print(f"  {path}  ({len(entries)} entries)")
    for e in sorted(entries):
        is_dir = e.startswith("d:")
        print(f"    {'📁' if is_dir else '📄'}  {e[2:]}{'/' if is_dir else ''}")


def cmd_read(path: str) -> None:
    """Read a file from the PS4 filesystem (first 4096 bytes)."""
    d = _rc_get(f"/read?path={urllib.parse.quote(path)}")
    if d is None:
        return
    if "error" in d:
        print(f"  Error: {d['error']}")
        return
    content = d.get("content", "")
    print(f"  --- {path} ({len(content)} bytes) ---")
    print(content[:4096])
    if len(content) > 4096:
        print(f"  ... (truncated, {len(content) - 4096} more bytes)")


def cmd_payloads() -> None:
    """List available payloads on the PS4."""
    d = _rc_get("/payloads")
    if d is None:
        return
    files = d.get("files", [])
    print(f"  {len(files)} payload(s) found:")
    for f in files:
        print(f"    • {f}")


def cmd_load(name: str) -> None:
    """Load a payload by filename (e.g. ftp-server.js)."""
    d = _rc_get(f"/load/{urllib.parse.quote(name)}")
    if d is None:
        return
    if d.get("ok"):
        print(f"  ✓ Loaded {name}")
    else:
        print(f"  ✗ Failed: {d.get('error', '')}")


def cmd_sysinfo() -> None:
    """Show system information from the PS4."""
    d = _rc_get("/sysinfo")
    if d is None:
        return
    for section in d.get("sections", []):
        print(f"\n  [{section.get('title', '')}]")
        for k, v in section.get("rows", {}).items():
            print(f"    {k:<22} {v}")


def cmd_logs(tail: int = 30) -> None:
    """Fetch recent log lines from the PS4."""
    d = _rc_get("/logs?since=0")
    if d is None:
        return
    entries = d.get("entries", [])[-tail:]
    for line in entries:
        print(f"  {line}")


HELP_TEXT = """
Commands
─────────────────────────────────────────────────────────────────
WebSocket (legacy JS inject):
  send <file>              Send a .js file to the PS4 via WebSocket
  quit / exit / disconnect Close the connection

Remote Control HTTP (needs -r <port> + remote-control.ts loaded):
  exec <js>                Execute JavaScript on the PS4
  ls [path]                List directory (default: /)
  read <path>              Print file contents
  payloads                 List available .js payloads
  load <filename>          Load a payload by filename
  sysinfo                  Show PS4 system information
  logs [n]                 Show last n log lines (default: 30)

Other:
  help / ?                 Show this help
─────────────────────────────────────────────────────────────────"""


# ── WebSocket helpers ─────────────────────────────────────────────────────────
async def send_file(ws: websockets.ClientConnection, file_path: str) -> None:
    try:
        p = pathlib.Path(file_path)
        if not p.is_file():
            log_print(f"[!] File not found: {file_path}")
            return
        message = p.read_text("utf-8")
        await ws.send(message)
        log_print(f"[*] Sent {file_path} ({len(message)} bytes)")
    except Exception as e:
        log_print(f"[!] Failed to send file: {e}")


async def command(ws: websockets.ClientConnection) -> None:
    global RETRY

    loop = asyncio.get_event_loop()
    while ws.state == websockets.protocol.State.OPEN:
        try:
            raw = await loop.run_in_executor(None, input, "> ")
        except (EOFError, KeyboardInterrupt):
            print()
            log_print("[*] Disconnecting...")
            await ws.close()
            RETRY = False
            break

        parts = raw.strip().split(maxsplit=1)
        if not parts:
            continue

        verb = parts[0].lower()
        rest = parts[1].strip() if len(parts) > 1 else ""

        if   verb == "exec":     cmd_exec(rest)
        elif verb == "ls":       cmd_ls(rest or "/")
        elif verb == "read":     cmd_read(rest)
        elif verb == "payloads": cmd_payloads()
        elif verb == "load":     cmd_load(rest)
        elif verb == "sysinfo":  cmd_sysinfo()
        elif verb == "logs":
            try:    cmd_logs(int(rest))
            except: cmd_logs()
        elif verb == "send":
            await send_file(ws, rest)
        elif verb in ("quit", "exit", "disconnect"):
            log_print("[*] Disconnecting...")
            await ws.close()
            RETRY = False
            break
        elif verb in ("help", "?", "h"):
            print(HELP_TEXT)
        else:
            print(f"  Unknown command '{verb}'. Type 'help' for usage.")


async def receiver(ws: websockets.ClientConnection) -> None:
    try:
        async for data in ws:
            if isinstance(data, str):
                log_print(data)
    except websockets.ConnectionClosed:
        log_print("[*] Disconnected")
    except Exception as e:
        log_print(f"[!] {e}")


async def main() -> None:
    print(f"PS4 Remote Control — {IP}:{WS_PORT}")
    if RC_PORT:
        print(f"Remote-control panel : http://{IP}:{RC_PORT}")
    print("Type 'help' for available commands.\n")

    while RETRY:
        ws = None
        r_task = c_task = None
        try:
            async with websockets.connect(
                f"ws://{IP}:{WS_PORT}", ping_timeout=None
            ) as ws:
                log_print(f"[*] Connected to {IP}:{WS_PORT} !!")
                r_task = asyncio.create_task(receiver(ws))
                c_task = asyncio.create_task(command(ws))
                await asyncio.wait([r_task, c_task], return_when=asyncio.FIRST_COMPLETED)
        except Exception:
            await asyncio.sleep(DELAY)
        finally:
            if r_task: r_task.cancel()
            if c_task: c_task.cancel()
            if ws and ws.state != websockets.protocol.State.CLOSED:
                await ws.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
