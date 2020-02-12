#!/usr/bin/env bash

git pull origin
npm install
pm2 restart index

