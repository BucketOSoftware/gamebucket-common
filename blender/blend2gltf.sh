#!/bin/zsh

# TODO: maybe this should be a node script, I dunno

setopt ERR_EXIT # VERBOSE
# TODO
# zmodload zsh/mathfunc

# gltf-transform throws warnings we don't care about
export NODE_NO_WARNINGS=1

# TODO: find a cross-platform version, or allow a path to Blender as an argument
local BLENDER_APP=$(mdfind 'kMDItemCFBundleIdentifier = "org.blenderfoundation.blender"' | head -1)
local BLENDER="$BLENDER_APP/Contents/MacOS/Blender"
local GLTF_TRANSFORM=(npx gltf-transform)

local PROJECT_ROOT=$(git rev-parse --show-toplevel)
local INFILE=$1
local OUTFILE=$(dirname $1)/$(basename -s .blend "$1").glb
if [[ ! -a "$INFILE" ]]; then
    echo "File not found: $INFILE"
    exit 1
fi

# These both seem to work OK but separate might be required to do flat shading? Maybe?
local COMMON_OPT=(--vertex-layout separate)
# local COMMON_OPT=(--vertex-layout interleaved)
# COMMON_OPT=(--verbose $COMMON_OPT)

local QUANT_OPT=(
    --quantization-volume mesh \
    --quantize-normal 8 \
    --quantize-texcoord 8 \
    --quantize-position 16 \
    --quantize-generic 16
)

print "$INFILE 🔜 $OUTFILE"

cd $PROJECT_ROOT
$BLENDER --background \
    --disable-autoexec \
    --log-level -1 \
    $INFILE \
    --python lib/blender/export_gltf.py

local SIZE_UNCOMP=$(wc -c < $OUTFILE)

print "dedup"
$GLTF_TRANSFORM dedup $OUTFILE $OUTFILE $COMMON_OPT
print "weld"
$GLTF_TRANSFORM weld $OUTFILE $OUTFILE $COMMON_OPT
print "reorder"
$GLTF_TRANSFORM reorder $OUTFILE $OUTFILE --target performance $COMMON_OPT
print "resample"
$GLTF_TRANSFORM resample $OUTFILE $OUTFILE --tolerance 0.00075 $COMMON_OPT
print "dedup again"
$GLTF_TRANSFORM dedup $OUTFILE $OUTFILE $COMMON_OPT
print "prune"
$GLTF_TRANSFORM prune --keep-leaves true $OUTFILE $OUTFILE $COMMON_OPT


# TODO: why does quantize cause problems with mesh-merging?
# $GLTF_TRANSFORM quantize $OUTFILE $OUTFILE $QUANT_OPT $COMMON_OPT    
# TODO: investigate draco

# gltfpack and meshoptimizer also seem promising, but in normal usage they didn't quite work
# npx gltfpack -c -kn -km -af 20 -i $OUTFILE -o $OUTFILE

local SIZE_COMP=$(wc -c < $OUTFILE)
local SIZE_GZIP=$(gzip $OUTFILE -c | wc -c)

$GLTF_TRANSFORM inspect --format csv $OUTFILE > $OUTFILE.stats.csv
printf "Compression: %'d %s %'d %s %'d\n" $SIZE_UNCOMP "⤵" $SIZE_COMP "⤵" $SIZE_GZIP

# TODO: zsh math is hard
# local REDUCTION=$((($SIZE_UNCOMP - $SIZE_COMP) / $SIZE_UNCOMP * 100.0))
# echo "➗ $REDUCTION"