# database.py
import os
import uuid
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

GRADE_NAMES = {
    0: 'No DR',
    1: 'Mild DR',
    2: 'Moderate DR',
    3: 'Severe DR',
    4: 'Proliferative DR'
}

URGENCY = {
    0: 'LOW',
    1: 'LOW',
    2: 'MEDIUM',
    3: 'HIGH',
    4: 'CRITICAL'
}

_SCHEMA_READY = False


def ensure_schema(conn):
    global _SCHEMA_READY
    if _SCHEMA_READY:
        return

    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS doctors (
                doctor_id       TEXT PRIMARY KEY,
                name            TEXT NOT NULL,
                email           TEXT UNIQUE NOT NULL,
                password        TEXT NOT NULL,
                hospital        TEXT NOT NULL,
                specialization  TEXT NOT NULL DEFAULT 'Ophthalmology',
                phone           TEXT,
                city            TEXT,
                avatar_path     TEXT,
                joined          DATE,
                total_scans     INTEGER NOT NULL DEFAULT 0,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )

        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS patient_records (
                record_id       TEXT PRIMARY KEY,
                doctor_id       TEXT NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
                doctor_name     TEXT NOT NULL,
                patient_name    TEXT NOT NULL,
                patient_age     INTEGER NOT NULL,
                patient_gender  TEXT NOT NULL,
                patient_id      TEXT NOT NULL,
                scan_date       DATE,
                scan_time       TIME,
                grade           INTEGER NOT NULL,
                grade_name      TEXT NOT NULL,
                confidence      DOUBLE PRECISION NOT NULL,
                urgency         TEXT NOT NULL,
                prob_grade_0    DOUBLE PRECISION NOT NULL,
                prob_grade_1    DOUBLE PRECISION NOT NULL,
                prob_grade_2    DOUBLE PRECISION NOT NULL,
                prob_grade_3    DOUBLE PRECISION NOT NULL,
                prob_grade_4    DOUBLE PRECISION NOT NULL,
                notes           TEXT,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )

        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_patient_records_doctor_created "
            "ON patient_records(doctor_id, created_at DESC)"
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_patient_records_patient "
            "ON patient_records(doctor_id, patient_id)"
        )

    conn.commit()
    _SCHEMA_READY = True


def get_connection():
    url = os.getenv('DATABASE_URL', '')
    url = url.replace('&channel_binding=require', '')
    url = url.replace('?channel_binding=require', '')
    if not url:
        raise Exception("DATABASE_URL not set in .env file")
    conn = psycopg2.connect(url, connect_timeout=5)
    ensure_schema(conn)
    return conn


def _generate_record_id():
    """
    Generate a collision-proof record ID.
    Format: REC + DDMMHHMM + 4 random hex chars  e.g. REC110923A4F1
    Never based on COUNT so deletions can't cause duplicates.
    """
    ts   = datetime.now().strftime('%d%m%H%M%S')
    uid  = uuid.uuid4().hex[:4].upper()
    return f"REC{ts}{uid}"


def add_record(doctor_id, doctor_name, patient_name,
               patient_age, patient_gender, patient_id,
               grade, confidence, all_probs, notes=''):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Generate unique ID, retry on the rare collision
            for _ in range(5):
                record_id = _generate_record_id()
                cur.execute(
                    "SELECT COUNT(*) FROM patient_records WHERE record_id = %s",
                    (record_id,)
                )
                if cur.fetchone()[0] == 0:
                    break

            cur.execute(
                """
                INSERT INTO patient_records (
                    record_id, doctor_id, doctor_name,
                    patient_name, patient_age, patient_gender,
                    patient_id, scan_date, scan_time,
                    grade, grade_name, confidence, urgency,
                    prob_grade_0, prob_grade_1, prob_grade_2,
                    prob_grade_3, prob_grade_4, notes
                ) VALUES (
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s
                )
                """,
                (
                    record_id,
                    doctor_id,
                    doctor_name,
                    patient_name.strip(),
                    int(patient_age),
                    patient_gender,
                    patient_id.strip(),
                    datetime.now().strftime('%Y-%m-%d'),
                    datetime.now().strftime('%H:%M:%S'),
                    int(grade),
                    GRADE_NAMES[grade],
                    round(float(confidence) * 100, 2),
                    URGENCY[grade],
                    round(float(all_probs[0]) * 100, 2),
                    round(float(all_probs[1]) * 100, 2),
                    round(float(all_probs[2]) * 100, 2),
                    round(float(all_probs[3]) * 100, 2),
                    round(float(all_probs[4]) * 100, 2),
                    notes.strip() if notes else ''
                )
            )
            conn.commit()
            return record_id

    except Exception as e:
        conn.rollback()
        raise Exception(f"Failed to save record: {str(e)}")
    finally:
        conn.close()


def get_doctor_records(doctor_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT * FROM patient_records
                WHERE  doctor_id = %s
                ORDER  BY created_at DESC
                """,
                (doctor_id,)
            )
            return _format_records([dict(r) for r in cur.fetchall()])

    except Exception as e:
        raise Exception(f"Failed to fetch records: {str(e)}")
    finally:
        conn.close()


def search_records(doctor_id, query):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT * FROM patient_records
                WHERE  doctor_id = %s
                AND (
                    LOWER(patient_name) LIKE LOWER(%s) OR
                    LOWER(patient_id)   LIKE LOWER(%s) OR
                    LOWER(grade_name)   LIKE LOWER(%s)
                )
                ORDER BY created_at DESC
                """,
                (doctor_id, f'%{query}%', f'%{query}%', f'%{query}%')
            )
            return _format_records([dict(r) for r in cur.fetchall()])

    except Exception as e:
        raise Exception(f"Search failed: {str(e)}")
    finally:
        conn.close()


def delete_record(record_id, doctor_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM patient_records WHERE record_id = %s AND doctor_id = %s",
                (record_id, doctor_id)
            )
            conn.commit()

    except Exception as e:
        conn.rollback()
        raise Exception(f"Delete failed: {str(e)}")
    finally:
        conn.close()


def get_record_by_id(record_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM patient_records WHERE record_id = %s",
                (record_id,)
            )
            row = cur.fetchone()
            if row:
                return _format_records([dict(row)])[0]
            return None

    except Exception as e:
        raise Exception(f"Failed to fetch record: {str(e)}")
    finally:
        conn.close()


def _format_records(data):
    for r in data:
        r['probabilities'] = {
            'Grade 0': r.get('prob_grade_0', 0),
            'Grade 1': r.get('prob_grade_1', 0),
            'Grade 2': r.get('prob_grade_2', 0),
            'Grade 3': r.get('prob_grade_3', 0),
            'Grade 4': r.get('prob_grade_4', 0),
        }
        r['date'] = str(r.get('scan_date', ''))
        r['time'] = str(r.get('scan_time', ''))
    return data