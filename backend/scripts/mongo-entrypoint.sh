#!/bin/bash
set -e

# Start MongoDB directly as primary process
exec mongod --replSet rs0 --bind_ip_all --dbpath /data/db
