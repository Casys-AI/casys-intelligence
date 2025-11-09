#!/usr/bin/env -S deno run --allow-read --allow-run
/**
 * Coverage Threshold Checker
 *
 * Parses Deno coverage output and enforces minimum coverage threshold.
 * Exits with code 1 if coverage is below threshold.
 *
 * Usage:
 *   deno run --allow-read --allow-run scripts/check-coverage.ts <coverage-dir> [threshold]
 *   deno run --allow-read --allow-run scripts/check-coverage.ts coverage 80
 */

const MIN_COVERAGE_THRESHOLD = 80; // Default: 80%

interface CoverageSummary {
  totalLines: number;
  coveredLines: number;
  percentage: number;
}

/**
 * Run deno coverage command and parse output
 */
async function getCoverageSummary(coverageDir: string): Promise<CoverageSummary> {
  const command = new Deno.Command("deno", {
    args: ["coverage", coverageDir, "--detailed"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await command.output();

  if (code !== 0) {
    const errorText = new TextDecoder().decode(stderr);
    throw new Error(`Failed to run deno coverage: ${errorText}`);
  }

  const output = new TextDecoder().decode(stdout);

  // Parse the summary line from deno coverage output
  // Format: "cover /path/to/file.ts ... X.XX% (YYY/ZZZ)"
  // Last line usually contains: "cover <coverage-dir> ... X.XX% (covered/total)"

  const lines = output.trim().split("\n");
  let totalLines = 0;
  let coveredLines = 0;

  // Parse each line looking for coverage percentages
  for (const line of lines) {
    // Match pattern: "... XX.XX% (covered/total)"
    const match = line.match(/(\d+\.\d+)%\s+\((\d+)\/(\d+)\)/);
    if (match) {
      const covered = parseInt(match[2], 10);
      const total = parseInt(match[3], 10);

      coveredLines += covered;
      totalLines += total;
    }
  }

  if (totalLines === 0) {
    throw new Error("Could not parse coverage output - no coverage data found");
  }

  const percentage = (coveredLines / totalLines) * 100;

  return {
    totalLines,
    coveredLines,
    percentage,
  };
}

/**
 * Main function
 */
async function main() {
  const args = Deno.args;

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: deno run --allow-read --allow-run scripts/check-coverage.ts <coverage-dir> [threshold]

Arguments:
  coverage-dir  Directory containing coverage data (required)
  threshold     Minimum coverage percentage (default: ${MIN_COVERAGE_THRESHOLD})

Examples:
  deno run --allow-read --allow-run scripts/check-coverage.ts coverage
  deno run --allow-read --allow-run scripts/check-coverage.ts coverage 75
`);
    Deno.exit(0);
  }

  const coverageDir = args[0];
  const threshold = args[1] ? parseFloat(args[1]) : MIN_COVERAGE_THRESHOLD;

  console.log(`\n📊 Checking code coverage...`);
  console.log(`Coverage directory: ${coverageDir}`);
  console.log(`Minimum threshold: ${threshold}%\n`);

  try {
    const summary = await getCoverageSummary(coverageDir);

    console.log(`Coverage Summary:`);
    console.log(`  Total lines:   ${summary.totalLines}`);
    console.log(`  Covered lines: ${summary.coveredLines}`);
    console.log(`  Coverage:      ${summary.percentage.toFixed(2)}%`);
    console.log();

    if (summary.percentage >= threshold) {
      console.log(`✅ Coverage ${summary.percentage.toFixed(2)}% meets threshold of ${threshold}%`);
      Deno.exit(0);
    } else {
      const deficit = threshold - summary.percentage;
      console.error(
        `❌ Coverage ${summary.percentage.toFixed(2)}% is below threshold of ${threshold}%`,
      );
      console.error(`   Deficit: ${deficit.toFixed(2)}%`);
      console.error();
      console.error(`💡 Tip: Add tests to increase coverage`);
      Deno.exit(1);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error checking coverage: ${errorMessage}`);
    Deno.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}
