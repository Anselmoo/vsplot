#!/bin/bash

# VSPlot Test Data Setup Script
# Downloads sample datasets and creates test fixtures for the VS Code data visualization extension

# Set the data directory (project-root/sample-data)
DATA_DIR="sample-data"

# Create sample-data directory if it doesn't exist
mkdir -p "$DATA_DIR"

echo "🚀 Setting up sample datasets and test fixtures for VSPlot..."

# Function to download with progress
download_file() {
    local url="$1"
    local filename="$2"
    local description="$3"
    local target_dir="${4:-$DATA_DIR}"  # Default to DATA_DIR if not specified

    echo "📊 Downloading $description..."
    if curl -L --progress-bar -o "$target_dir/$filename" "$url"; then
        echo "✅ $description downloaded successfully as $filename"
    else
        echo "❌ Failed to download $description"
        return 1
    fi
}

# Download Iris dataset (classic ML dataset)
download_file \
    "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv" \
    "iris.csv" \
    "Iris flower dataset"

# Download Titanic dataset (survival analysis)
download_file \
    "https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv" \
    "titanic.csv" \
    "Titanic passenger dataset"

# Download Boston Housing dataset
download_file \
    "https://raw.githubusercontent.com/selva86/datasets/master/BostonHousing.csv" \
    "boston_housing.csv" \
    "Boston Housing prices dataset"

# Download Weather dataset
download_file \
    "https://raw.githubusercontent.com/plotly/datasets/master/2011_february_us_airport_traffic.csv" \
    "weather.csv" \
    "US airport traffic sample"

# Create a sample 3D dataset as JSON
echo "📊 Creating 3D sample data..."
cat > "$DATA_DIR/3d-sample.json" << 'EOF'
{
  "title": "3D Scatter Plot Sample Data",
  "description": "Sample 3D coordinates with categories",
  "data": [
    {"x": 1.2, "y": 2.3, "z": 3.1, "category": "A", "value": 10},
    {"x": 2.1, "y": 1.8, "z": 2.9, "category": "A", "value": 15},
    {"x": 3.4, "y": 4.2, "z": 1.8, "category": "B", "value": 8},
    {"x": 1.8, "y": 3.6, "z": 4.2, "category": "B", "value": 12},
    {"x": 4.1, "y": 2.1, "z": 3.8, "category": "C", "value": 20},
    {"x": 2.8, "y": 3.9, "z": 2.2, "category": "C", "value": 18},
    {"x": 3.7, "y": 1.4, "z": 4.5, "category": "A", "value": 14},
    {"x": 1.5, "y": 4.8, "z": 2.7, "category": "B", "value": 9},
    {"x": 4.3, "y": 3.2, "z": 3.3, "category": "C", "value": 22},
    {"x": 2.6, "y": 2.7, "z": 4.1, "category": "A", "value": 16}
  ]
}
EOF
echo "✅ 3D sample data created successfully"

# Create a sample time series dataset
echo "📊 Creating time series sample data..."
cat > "$DATA_DIR/timeseries-sample.csv" << 'EOF'
Date,Temperature,Humidity,Pressure
2024-01-01,18.5,65,1013.2
2024-01-02,19.2,68,1012.8
2024-01-03,17.8,72,1014.1
2024-01-04,20.1,63,1013.5
2024-01-05,21.3,59,1012.3
2024-01-06,19.7,66,1013.8
2024-01-07,18.9,70,1014.2
2024-01-08,22.1,55,1011.9
2024-01-09,23.4,52,1010.8
2024-01-10,21.8,58,1012.1
2024-01-11,20.5,62,1013.4
2024-01-12,19.3,67,1014.0
2024-01-13,18.1,71,1014.5
2024-01-14,17.4,74,1015.1
2024-01-15,16.8,76,1015.8
EOF
echo "✅ Time series sample data created successfully"

# Create a sample categorical dataset
echo "📊 Creating categorical sample data..."
cat > "$DATA_DIR/sales-sample.dat" << 'EOF'
Product|Region|Sales|Quarter
Laptop|North|1500|Q1
Laptop|South|1200|Q1
Laptop|East|1800|Q1
Laptop|West|1350|Q1
Phone|North|2200|Q1
Phone|South|1900|Q1
Phone|East|2500|Q1
Phone|West|2100|Q1
Tablet|North|800|Q1
Tablet|South|650|Q1
Tablet|East|950|Q1
Tablet|West|750|Q1
Laptop|North|1650|Q2
Laptop|South|1400|Q2
Laptop|East|1950|Q2
Laptop|West|1500|Q2
Phone|North|2400|Q2
Phone|South|2100|Q2
Phone|East|2700|Q2
Phone|West|2300|Q2
Tablet|North|900|Q2
Tablet|South|750|Q2
Tablet|East|1050|Q2
Tablet|West|850|Q2
EOF
echo "✅ Sales sample data created successfully"

# Create test.tsv file for TSV format testing
echo "📊 Creating TSV test file..."
cat > "$DATA_DIR/test.tsv" << 'EOF'
Name	Age	Score
Alice	25	95.5
Bob	30	87.3
Charlie	35	92.1
EOF
echo "✅ TSV test file created successfully"

# Create test.tab file for TAB format testing
echo "📊 Creating TAB test file..."
cat > "$DATA_DIR/test.tab" << 'EOF'
Product	Sales	Revenue
Widget	100	1250.50
Gadget	150	2375.75
Tool	75	937.25
EOF
echo "✅ TAB test file created successfully"

# Create test.out file for OUT format testing
echo "📊 Creating OUT test file..."
cat > "$DATA_DIR/test.out" << 'EOF'
X,Y,Z
1.0,2.5,3.7
2.0,4.1,5.2
3.0,6.3,7.8
EOF
echo "✅ OUT test file created successfully"

# Create test.data file for DATA format testing
echo "📊 Creating DATA test file..."
cat > "$DATA_DIR/test.data" << 'EOF'
Temperature Pressure Humidity
25.5 1013.25 65
26.2 1012.80 68
24.8 1014.10 62
EOF
echo "✅ DATA test file created successfully"

# Create semicolon-delimited file for delimiter testing
echo "📊 Creating semicolon-delimited test file..."
cat > "$DATA_DIR/semicolon-delimited.csv" << 'EOF'
Country;Population;GDP;Continent
France;67.4;2940;Europe
Germany;83.2;4230;Europe
Italy;59.1;2010;Europe
Spain;47.4;1430;Europe
EOF
echo "✅ Semicolon-delimited test file created successfully"

# Create test-data directory for delimiter detection tests
TEST_DATA_DIR="test-data"
mkdir -p "$TEST_DATA_DIR"

echo "📊 Creating test delimiter fixtures..."
cat > "$TEST_DATA_DIR/colon-delimited.txt" << 'EOF'
name:age:city
Alice:30:Seattle
Bob:25:Portland
Carol:35:San Francisco
EOF

cat > "$TEST_DATA_DIR/pipe-delimited.dat" << 'EOF'
product|price|quantity
Widget|19.99|5
Gadget|29.99|3
Thingamajig|9.99|12
EOF

cat > "$TEST_DATA_DIR/space-delimited.txt" << 'EOF'
planet mass gravity
Mercury 0.055 3.7
Venus 0.815 8.87
Earth 1.0 9.81
EOF

cat > "$TEST_DATA_DIR/single-column.txt" << 'EOF'
value
alpha
beta
gamma
EOF
echo "✅ Test delimiter fixtures created successfully"

# Create test files with comments for comment handling tests
echo "📊 Creating comment handling test fixtures..."
cat > "$TEST_DATA_DIR/csv-with-comments.csv" << 'EOF'
# This is a comment line
# Another comment
Name,Age,Score
Alice,25,95.5
% This is also a comment (percent marker)
Bob,30,87.3
// This is a slash comment
Charlie,35,92.1
EOF

cat > "$TEST_DATA_DIR/txt-with-comments.txt" << 'EOF'
# Data file with hash comments
name:age:city
# First record below
Alice:30:Seattle
Bob:25:Portland
# Another comment
Carol:35:San Francisco
EOF

cat > "$TEST_DATA_DIR/dat-with-comments.dat" << 'EOF'
// Pipe-delimited data with slash comments
product|price|quantity
Widget|19.99|5
// Mid-file comment
Gadget|29.99|3
% Percent comment marker
Thingamajig|9.99|12
EOF

cat > "$TEST_DATA_DIR/custom-comment-markers.txt" << 'EOF'
## Custom double-hash comment
! Exclamation comment
data1,data2,data3
1,2,3
## Another custom comment
4,5,6
! Another exclamation
7,8,9
EOF
echo "✅ Comment handling test fixtures created successfully"

# Download scatter plot numeric regression test file (Issue #30)
# This file tests that scatter plots with numeric X-axis don't collapse to a single point
download_file \
    "https://github.com/user-attachments/files/23616369/test1.csv" \
    "scatter-numeric-regression.csv" \
    "Scatter plot numeric regression test data" \
    "$TEST_DATA_DIR"

echo ""
echo "🎉 All sample datasets downloaded and created successfully!"
echo "📁 Data files are located in: $DATA_DIR"
echo "📁 Test fixtures are located in: $TEST_DATA_DIR"
echo ""
echo "Available datasets:"
echo "  - iris.csv: Classic flower classification dataset"
echo "  - titanic.csv: Passenger survival data"
echo "  - boston_housing.csv: Real estate prices"
echo "  - weather.csv: US airport traffic sample"
echo "  - 3d-sample.json: 3D scatter plot data"
echo "  - timeseries-sample.csv: Time series data"
echo "  - sales-sample.dat: Categorical sales data"
echo "  - test.tsv: TSV format test file"
echo "  - test.tab: TAB format test file"
echo "  - test.out: OUT format test file"
echo "  - test.data: DATA format test file"
echo "  - semicolon-delimited.csv: Semicolon-separated sample (delimiter tests)"
echo "  - colon-delimited.txt: Colon-separated sample (delimiter tests)"
echo "  - pipe-delimited.dat: Pipe-separated sample (delimiter tests)"
echo "  - space-delimited.txt: Space-separated sample (delimiter tests)"
echo "  - single-column.txt: Single column sample (delimiter fallback tests)"
echo "  - csv-with-comments.csv: CSV with comment lines (comment handling tests)"
echo "  - txt-with-comments.txt: TXT with hash comments (comment handling tests)"
echo "  - dat-with-comments.dat: DAT with multiple comment markers (comment handling tests)"
echo "  - custom-comment-markers.txt: File for custom comment marker tests"
echo "  - scatter-numeric-regression.csv: Regression test for issue #30 (numeric X-axis scatter plots)"
echo ""
echo "🚀 Ready to test VSPlot extension with sample data!"
