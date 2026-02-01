#!/bin/bash

export INPUT_SOURCE_FILE="./app_en.arb"
export INPUT_TARGET_FILE="./app_es.arb, ./app_fr.arb, ./app_de.arb"
export INPUT_TARGET_LANG_CODE="es, fr, de"

node index.js