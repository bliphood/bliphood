#!/usr/bin/env python3
"""
SQLite database module for BlipHood Agent Solver analytics.
Tracks solve history, gas usage, timing, and provides stats queries.
"""

import sqlite3
import time
import datetime
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent / "bliphood.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS solves (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp      REAL NOT NULL,
    nonce          INTEGER NOT NULL,
    seed           TEXT NOT NULL,
    solve_ms       INTEGER NOT NULL,
    gas_used       INTEGER,
    tx_hash        TEXT,
    success        INTEGER NOT NULL DEFAULT 1,
    round_num      INTEGER NOT NULL DEFAULT 0,
    workers        INTEGER NOT NULL DEFAULT 0,
    error_msg      TEXT,
    chain_id       INTEGER NOT NULL DEFAULT 46630,
    bliphd_amount  REAL NOT NULL DEFAULT 0,
    eth_spent_wei  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_solves_timestamp ON solves(timestamp);
CREATE INDEX IF NOT EXISTS idx_solves_success  ON solves(success);
CREATE INDEX IF NOT EXISTS idx_solves_seed     ON solves(seed);
"""


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _ensure_columns(conn: sqlite3.Connection) -> None:
    """Add missing columns to existing databases."""
    existing = {r[1] for r in conn.execute("PRAGMA table_info(solves)").fetchall()}
    if "bliphd_amount" not in existing:
        conn.execute("ALTER TABLE solves ADD COLUMN bliphd_amount REAL NOT NULL DEFAULT 0")
    if "eth_spent_wei" not in existing:
        conn.execute("ALTER TABLE solves ADD COLUMN eth_spent_wei INTEGER NOT NULL DEFAULT 0")


def init_db() -> None:
    conn = _connect()
    try:
        conn.executescript(SCHEMA)
        _ensure_columns(conn)
        conn.commit()
    finally:
        conn.close()


def record_solve(
    nonce: int,
    seed: str,
    solve_ms: int,
    gas_used: int,
    tx_hash: str,
    round_num: int,
    workers: int,
    chain_id: int = 46630,
    bliphd_amount: float = 20000,
    eth_spent_wei: int = 0,
) -> int:
    conn = _connect()
    try:
        _ensure_columns(conn)
        cur = conn.execute(
            """INSERT INTO solves
               (timestamp, nonce, seed, solve_ms, gas_used, tx_hash, success,
                round_num, workers, chain_id, bliphd_amount, eth_spent_wei)
               VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)""",
            (time.time(), nonce, seed, solve_ms, gas_used, tx_hash,
             round_num, workers, chain_id, bliphd_amount, eth_spent_wei),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def record_failure(
    error_msg: str = "",
    seed: str = "",
    round_num: int = 0,
    workers: int = 0,
    chain_id: int = 46630,
) -> int:
    conn = _connect()
    try:
        _ensure_columns(conn)
        cur = conn.execute(
            """INSERT INTO solves
               (timestamp, nonce, seed, solve_ms, gas_used, tx_hash, success,
                round_num, workers, chain_id, error_msg, bliphd_amount, eth_spent_wei)
               VALUES (?, 0, ?, 0, 0, '', 0, ?, ?, ?, ?, 0, 0)""",
            (time.time(), seed, round_num, workers, chain_id, error_msg),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def get_stats() -> dict:
    conn = _connect()
    try:
        _ensure_columns(conn)
        total_attempts = conn.execute("SELECT COUNT(*) FROM solves").fetchone()[0]
        total_success = conn.execute(
            "SELECT COUNT(*) FROM solves WHERE success = 1"
        ).fetchone()[0]
        total_failures = total_attempts - total_success

        row = conn.execute(
            "SELECT COALESCE(SUM(bliphd_amount), 0), COALESCE(SUM(eth_spent_wei), 0) "
            "FROM solves WHERE success = 1"
        ).fetchone()

        stats = {
            "total_attempts": total_attempts,
            "total_solves": total_success,
            "total_failures": total_failures,
            "success_rate": round(total_success / total_attempts * 100, 1) if total_attempts > 0 else 0,
            "total_bliphd": row[0],
            "total_eth_spent": round(row[1] / 1e18, 4),
        }

        if total_success > 0:
            row2 = conn.execute("""
                SELECT
                    COALESCE(AVG(solve_ms), 0),
                    MIN(solve_ms),
                    MAX(solve_ms),
                    COALESCE(SUM(gas_used), 0),
                    MIN(timestamp),
                    MAX(timestamp)
                FROM solves WHERE success = 1
            """).fetchone()
            stats["avg_solve_ms"] = round(row2[0])
            stats["best_solve_ms"] = row2[1]
            stats["worst_solve_ms"] = row2[2]
            stats["total_gas"] = row2[3]
            span_sec = max(row2[5] - row2[4], 1)
            stats["solves_per_hour"] = round(total_success / (span_sec / 3600), 1)
            stats["time_span_hours"] = round(span_sec / 3600, 1)
        else:
            stats.update({
                "avg_solve_ms": 0, "best_solve_ms": 0, "worst_solve_ms": 0,
                "total_gas": 0, "solves_per_hour": 0, "time_span_hours": 0,
            })

        streak_row = conn.execute("""
            SELECT COUNT(*) FROM solves
            WHERE id > COALESCE(
                (SELECT MAX(id) FROM solves WHERE success = 0),
                0
            )
        """).fetchone()
        stats["current_streak"] = streak_row[0]

        hour_ago = time.time() - 3600
        stats["solves_last_hour"] = conn.execute(
            "SELECT COUNT(*) FROM solves WHERE success = 1 AND timestamp > ?",
            (hour_ago,),
        ).fetchone()[0]

        return stats
    finally:
        conn.close()


def get_recent_solves(limit: int = 20) -> list[dict]:
    conn = _connect()
    try:
        _ensure_columns(conn)
        rows = conn.execute("""
            SELECT id, timestamp, nonce, seed, solve_ms, gas_used, tx_hash, success,
                   round_num, workers, error_msg, bliphd_amount, eth_spent_wei
            FROM solves
            ORDER BY id DESC
            LIMIT ?
        """, (limit,)).fetchall()

        return [
            {
                "id": r[0],
                "timestamp": r[1],
                "nonce": r[2],
                "seed": r[3],
                "solve_ms": r[4],
                "gas_used": r[5],
                "tx_hash": r[6],
                "success": bool(r[7]),
                "round_num": r[8],
                "workers": r[9],
                "error_msg": r[10] or "",
                "bliphd_amount": r[11],
                "eth_spent_wei": r[12],
            }
            for r in rows
        ]
    finally:
        conn.close()


def get_daily_summary(days: int = 14) -> list[dict]:
    conn = _connect()
    try:
        _ensure_columns(conn)
        cutoff = time.time() - days * 86400
        rows = conn.execute("""
            SELECT timestamp,
                   success,
                   solve_ms,
                   gas_used,
                   bliphd_amount,
                   eth_spent_wei
            FROM solves
            WHERE timestamp > ?
            ORDER BY timestamp
        """, (cutoff,)).fetchall()

        groups: dict[str, dict] = {}
        for ts, success, solve_ms, gas_used, bliphd_amount, eth_spent_wei in rows:
            day = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d')
            if day not in groups:
                groups[day] = {
                    "attempts": 0, "solves": 0, "failures": 0,
                    "solve_ms_sum": 0, "solve_ms_count": 0,
                    "total_gas": 0, "total_bliphd": 0, "total_eth_wei": 0,
                }
            g = groups[day]
            g["attempts"] += 1
            if success:
                g["solves"] += 1
                if solve_ms:
                    g["solve_ms_sum"] += solve_ms
                    g["solve_ms_count"] += 1
                g["total_gas"] += gas_used or 0
                g["total_bliphd"] += bliphd_amount or 0
                g["total_eth_wei"] += eth_spent_wei or 0
            else:
                g["failures"] += 1

        result = []
        for day in sorted(groups.keys(), reverse=True):
            g = groups[day]
            result.append({
                "day": day,
                "attempts": g["attempts"],
                "solves": g["solves"],
                "failures": g["failures"],
                "avg_solve_ms": round(g["solve_ms_sum"] / g["solve_ms_count"]) if g["solve_ms_count"] else 0,
                "total_gas": g["total_gas"],
                "total_bliphd": g["total_bliphd"],
                "total_eth_spent": round(g["total_eth_wei"] / 1e18, 4),
            })
        return result
    finally:
        conn.close()
