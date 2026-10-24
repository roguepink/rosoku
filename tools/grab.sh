#!/bin/zsh
# Flow から保存した いちばん新しいファイル(2分以内に保存したものだけ)を _check/flow/raw/<名前> に移す
f=$(ls -t ~/Downloads/*.(jpg|png|mp4)(Nmm-2) 2>/dev/null | head -1)
[ -z "$f" ] && { echo "新しいファイルなし"; exit 1; }
mv "$f" ~/claude-work/rosoku/_check/flow/raw/$1 && echo "移した: $1 ← $(basename $f)"
