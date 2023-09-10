#!/usr/bin/env sh

echo $(cat .nvmrc | tr -cd '[:digit:].')
