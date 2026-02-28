"""
OCW lecture transcript extractor — multi-course edition.

Iterates over every subdirectory in ./input/, treats each as a course root,
and writes individual JSON files organised as:

    data/{course}/{subject_slug}/{lecture_number}/data.json

where subject_slug is the lecture subject with spaces replaced by underscores
and non-alphanumeric characters removed.

Usage:
    python3 extract.py

Requires: Python 3.7+ stdlib only + system pdftotext (poppler-utils)
"""

import glob
import json
import os
import re
import subprocess
import sys

INPUT_DIR = './input'


def discover_lectures(base):
    """Return sorted list of data.json paths for all lecture directories.

    Pattern lecture-*/data.json is used directly so that lecture-videos/
    (which has no data.json) is excluded automatically by glob.
    Returns exactly 35 paths for the MIT 18.06 Spring 2010 course.
    """
    pattern = os.path.join(base, 'resources', 'lecture-*', 'data.json')
    return sorted(glob.glob(pattern))


def parse_title(title):
    """Parse 'Lecture N: Subject' title into (num_str, subject).

    Returns (None, None) if the title does not match the expected pattern.
    Handles numeric-only lecture numbers (e.g. '9') and alphanumeric ones (e.g. '24b').
    """
    m = re.match(r'Lecture (\d+[a-z]?):\s*(.+)', title, re.IGNORECASE)
    if not m:
        return None, None
    return m.group(1), m.group(2)


def extract_pdf_text(pdf_path):
    """Run pdftotext on pdf_path and return the extracted text.

    -nopgbrk prevents form-feed (\\x0c) characters between pages.
    Returns result.stdout (string) if successful, or None on failure.
    """
    result = subprocess.run(
        ['pdftotext', '-nopgbrk', pdf_path, '-'],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        return None
    return result.stdout


def sort_key(entry):
    """Sort key that places '24b' after 24 and before 25.

    Normalises lecture_number to a (int_base, str_suffix) tuple so that
    mixed int/str comparison works in Python 3:
        (24, '') < (24, 'b') < (25, '')
    """
    num = str(entry['lecture_number'])
    base = int(re.match(r'(\d+)', num).group(1))
    suffix = re.sub(r'^\d+', '', num)  # '' for pure integers, 'b' for '24b'
    return (base, suffix)


def slugify(text):
    """Convert a subject string to a safe directory name.

    Replaces whitespace with underscores and strips characters that are
    not alphanumeric, underscores, or hyphens.
    """
    text = re.sub(r'\s+', '_', text.strip())
    text = re.sub(r'[^\w\-]', '', text)
    return text


def process_course(course_dir, course_name):
    """Extract all lectures from one course directory.

    Returns a sorted list of lecture entry dicts.
    """
    lectures = []

    for data_path in discover_lectures(course_dir):
        with open(data_path) as f:
            data = json.load(f)

        title = data.get('title', '')
        num_str, subject = parse_title(title)
        if num_str is None:
            print(f'[{course_name}] WARNING: Cannot parse title: {title!r}', file=sys.stderr)
            continue

        tf = data.get('transcript_file', '')
        if not tf:
            print(f'[{course_name}] WARNING: No transcript_file for: {title}', file=sys.stderr)
            continue

        # transcript_file is a URL path — use only the basename.
        pdf_fname = os.path.basename(tf)
        pdf_path = os.path.join(course_dir, 'static_resources', pdf_fname)

        if not os.path.exists(pdf_path):
            print(f'[{course_name}] WARNING: PDF not found: {pdf_path}', file=sys.stderr)
            continue

        print(f'[{course_name}] Processing lecture {num_str}: {subject}...')

        content = extract_pdf_text(pdf_path)
        if content is None:
            print(f'[{course_name}] WARNING: pdftotext failed for: {pdf_fname}', file=sys.stderr)
            continue

        try:
            lecture_number = int(num_str)
        except ValueError:
            lecture_number = num_str

        lectures.append({
            'lecture_number': lecture_number,
            'subject': subject,
            'content': content,
            'examples': []
        })

    lectures.sort(key=sort_key)
    return lectures


def main():
    if not os.path.isdir(INPUT_DIR):
        print(f'ERROR: input directory not found: {INPUT_DIR}', file=sys.stderr)
        sys.exit(1)

    courses = sorted(
        d for d in os.listdir(INPUT_DIR)
        if os.path.isdir(os.path.join(INPUT_DIR, d))
    )

    if not courses:
        print(f'ERROR: no subdirectories found in {INPUT_DIR}', file=sys.stderr)
        sys.exit(1)

    total_written = 0

    for course_name in courses:
        course_dir = os.path.join(INPUT_DIR, course_name)
        print(f'\n=== Course: {course_name} ===')
        lectures = process_course(course_dir, course_name)

        written = 0
        for entry in lectures:
            subject_slug = slugify(entry['subject'])
            lecture_dir = os.path.join('data', course_name, subject_slug, str(entry['lecture_number']))
            os.makedirs(lecture_dir, exist_ok=True)
            out_path = os.path.join(lecture_dir, 'data.json')
            with open(out_path, 'w', encoding='utf-8') as f:
                json.dump(entry, f, indent=2, ensure_ascii=False)
            written += 1

        print(f'  Wrote {written} lectures to data/{course_name}/<subject>/<lecture>/data.json')
        total_written += written

    print(f'\nDone. {total_written} lectures total across {len(courses)} course(s).')


if __name__ == '__main__':
    main()
