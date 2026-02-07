#!/bin/bash
# Test script to verify MinIO bucket initialization

set -e

test_bucket_exists() {
    if docker exec learning-system-minio mc ls local/learning-files >/dev/null 2>&1; then
        echo "PASS: Bucket learning-files exists"
        return 0
    else
        echo "FAIL: Bucket learning-files does not exist"
        return 1
    fi
}

test_bucket_public_read() {
    # Check if anonymous read policy is set
    local policy
    policy=$(docker exec learning-system-minio mc anonymous get json local/learning-files 2>/dev/null || echo "no-policy")
    if [ "$policy" != "no-policy" ]; then
        echo "PASS: Bucket has public read access configured"
        return 0
    else
        echo "FAIL: Bucket does not have public read access"
        return 1
    fi
}

echo "Running MinIO bucket tests..."
echo ""

echo "Test 1: Bucket exists"
test_bucket_exists
echo ""

echo "Test 2: Bucket has public read access"
test_bucket_public_read
echo ""

echo "All tests passed!"
