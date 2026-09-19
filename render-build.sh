#!/usr/bin/env bash
set -o errexit

echo "===> Building React Frontend..."
cd frontend
npm install
npm run build
cd ..

echo "===> Installing Backend Python Dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "===> Build Complete!"
