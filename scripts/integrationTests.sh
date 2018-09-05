#! /bin/bash

# really would like to modify testrpc to add:
#   - account params from a JSON file
#   - `testrpc start` and `testrpc stop`, so these custom scripts don't
#      have to be added to every project

output=$(nc -z localhost 8545; echo $?)
[ $output -eq "0" ] && ganache_running=true
if [ ! $ganache_running ]; then
  echo "Starting our own ganache instance"
  ganache-cli \
    -l 7000000 \
    -m "skull reason path dust cost unaware unknown outer shaft spell outer typical" \
  > /dev/null &
  ganache_pid=$!
fi

npm run migrate-reset

npm run scenario addListing

kill -9 $ganache_pid
