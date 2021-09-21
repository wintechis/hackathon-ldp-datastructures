#! /bin/bash
curl -X POST http://localhost:8000/push -H "Content-Type: text/turtle" --data-raw "@prefix : <http://localhost:8000/> . @prefix xsd: <http://www.w3.org/2001/XMLSchema#> . @prefix sosa: <http://www.w3.org/ns/sosa/> . <> :value \"${1}\"^^xsd:integer ."
