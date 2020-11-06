#!/bin/bash
cat userssharedsdfteachingamericanhistory2010applicants.csv | node parse-to-jsonl.js > result.jsonl
diff result.jsonl expected.jsonl
RESULT=$?
if [ $RESULT -ne 0 ]; then
    echo "Error! Output does not match."
else
    echo "Success!"
fi

