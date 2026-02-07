#!/bin/bash
# MinIO Bucket Initialization Script
# Creates and configures the learning-files bucket

set -e

CONTAINER_NAME="learning-system-minio"
BUCKET_NAME="learning-files"
ALIAS="local"

echo "=== MinIO Bucket Initialization ==="
echo ""

# Step 1: Configure mc alias for local MinIO
echo "[1/4] Setting up MinIO Client alias..."
if ! docker exec "$CONTAINER_NAME" mc alias get "$ALIAS" >/dev/null 2>&1; then
    docker exec "$CONTAINER_NAME" mc alias set "$ALIAS" http://localhost:9000 minioadmin minioadmin
    echo "  Alias '$ALIAS' configured successfully"
else
    echo "  Alias '$ALIAS' already configured"
fi

# Step 2: Create bucket if it doesn't exist
echo ""
echo "[2/4] Ensuring bucket '$BUCKET_NAME' exists..."
if docker exec "$CONTAINER_NAME" mc ls "$ALIAS/$BUCKET_NAME" >/dev/null 2>&1; then
    echo "  Bucket '$BUCKET_NAME' already exists"
else
    docker exec "$CONTAINER_NAME" mc mb "$ALIAS/$BUCKET_NAME"
    echo "  Bucket '$BUCKET_NAME' created successfully"
fi

# Step 3: Set public read access on the bucket
echo ""
echo "[3/4] Configuring public read access..."
# Check if anonymous policy already exists
if docker exec "$CONTAINER_NAME" mc anonymous get "$ALIAS/$BUCKET_NAME" >/dev/null 2>&1; then
    echo "  Public read access already configured"
else
    docker exec "$CONTAINER_NAME" mc anonymous set public "$ALIAS/$BUCKET_NAME"
    echo "  Public read access configured successfully"
fi

# Step 4: Verify configuration
echo ""
echo "[4/4] Verifying configuration..."
if docker exec "$CONTAINER_NAME" mc ls "$ALIAS/$BUCKET_NAME" >/dev/null 2>&1; then
    echo "  Bucket verified: $ALIAS/$BUCKET_NAME"
else
    echo "  ERROR: Bucket verification failed"
    exit 1
fi

echo ""
echo "=== MinIO Bucket Initialization Complete ==="
echo "Bucket: $ALIAS/$BUCKET_NAME"
echo "Access: Public read"
