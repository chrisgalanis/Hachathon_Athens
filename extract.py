"""
MIT 18.06 Linear Algebra (Spring 2010) lecture transcript extractor.

Reads all 35 lecture PDFs from the local OCW directory and writes
a sorted data/lectures.json with lecture_number, subject, content, examples.

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

# Hardcoded path to the local OCW course directory.
# Update this if the course is stored elsewhere.
BASE = '/home/chris/Downloads/18.06-spring-2010'


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


def main():
    lectures = []

    for data_path in discover_lectures(BASE):
        # Load the lecture metadata JSON
        with open(data_path) as f:
            data = json.load(f)

        title = data.get('title', '')
        num_str, subject = parse_title(title)
        if num_str is None:
            print(f'WARNING: Cannot parse title: {title!r}', file=sys.stderr)
            continue

        tf = data.get('transcript_file', '')
        if not tf:
            print(f'WARNING: No transcript_file for: {title}', file=sys.stderr)
            continue

        # IMPORTANT: transcript_file is a URL path, e.g.
        #   '/courses/18-06-linear-algebra-spring-2010/HASH.pdf'
        # NOT a filesystem path. Use only the basename.
        pdf_fname = os.path.basename(tf)
        pdf_path = os.path.join(BASE, 'static_resources', pdf_fname)

        if not os.path.exists(pdf_path):
            print(f'WARNING: PDF not found: {pdf_path}', file=sys.stderr)
            continue

        # QUAL-02: print progress for each lecture being processed
        print(f'Processing lecture {num_str}: {subject}...')

        content = extract_pdf_text(pdf_path)
        if content is None:
            print(f'WARNING: pdftotext failed for: {pdf_fname}', file=sys.stderr)
            continue

        # Store lecture_number as int for pure-digit entries (1-34),
        # and as the string '24b' for the supplementary lecture.
        # int("24b") raises ValueError, which we catch here.
        try:
            lecture_number = int(num_str)
        except ValueError:
            lecture_number = num_str  # '24b' — one entry, cannot be int

        lectures.append({
            'lecture_number': lecture_number,
            'subject': subject,
            'content': content,
            'examples': []
        })

    # Sort ascending: 1, 2, ..., 24, '24b', 25, ..., 35
    lectures.sort(key=sort_key)

    os.makedirs('data', exist_ok=True)
    with open('data/lectures.json', 'w', encoding='utf-8') as f:
        json.dump(lectures, f, indent=2, ensure_ascii=False)

    print(f'\nDone. Wrote {len(lectures)} lectures to data/lectures.json')


if __name__ == '__main__':
    main()
