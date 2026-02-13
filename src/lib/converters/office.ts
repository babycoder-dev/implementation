import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Supported Office file extensions
const OFFICE_EXTENSIONS = ['.doc', '.docx', '.ppt', '.pptx'];

// Default timeout for conversion (5 minutes)
const CONVERSION_TIMEOUT = 5 * 60 * 1000;

/**
 * Check if a file is an Office document
 */
export function isOfficeFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return OFFICE_EXTENSIONS.includes(ext);
}

/**
 * Get the Office file extension
 */
export function getOfficeExtension(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  return OFFICE_EXTENSIONS.includes(ext) ? ext : null;
}

/**
 * Convert an Office document to PDF using LibreOffice
 */
export async function convertToPdf(
  inputPath: string,
  outputDir: string
): Promise<string> {
  const absoluteInputPath = path.resolve(inputPath);
  const absoluteOutputDir = path.resolve(outputDir);

  // Validate input file exists
  if (!existsSync(absoluteInputPath)) {
    throw new Error(`Input file does not exist: ${absoluteInputPath}`);
  }

  // Validate it's an Office file
  if (!isOfficeFile(absoluteInputPath)) {
    throw new Error(`File is not an Office document: ${absoluteInputPath}`);
  }

  // Ensure output directory exists
  if (!existsSync(absoluteOutputDir)) {
    await mkdir(absoluteOutputDir, { recursive: true });
  }

  const fileName = path.basename(absoluteInputPath);
  const baseName = path.parse(fileName).name;
  const outputFileName = `${baseName}.pdf`;
  const absoluteOutputPath = path.join(absoluteOutputDir, outputFileName);

  console.log(`[OfficeConverter] Starting conversion:`);
  console.log(`[OfficeConverter]   Input: ${absoluteInputPath}`);
  console.log(`[OfficeConverter]   Output: ${absoluteOutputPath}`);

  try {
    // Use LibreOffice to convert to PDF
    // --headless: Run without GUI
    // --convert-to pdf: Convert to PDF
    // --outdir: Output directory
    // --nologo: No logo
    // --nofirststartwizard: Skip first start wizard
    const { stdout, stderr } = await execAsync(
      `soffice --headless --convert-to pdf --outdir "${absoluteOutputDir}" --nologo --nofirststartwizard "${absoluteInputPath}"`,
      {
        timeout: CONVERSION_TIMEOUT,
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large files
      }
    );

    console.log(`[OfficeConverter] LibreOffice stdout: ${stdout}`);

    if (stderr) {
      console.warn(`[OfficeConverter] LibreOffice stderr: ${stderr}`);
    }

    // Verify the output file was created
    if (!existsSync(absoluteOutputPath)) {
      throw new Error('PDF file was not created after conversion');
    }

    console.log(`[OfficeConverter] Conversion successful: ${absoluteOutputPath}`);

    return absoluteOutputPath;
  } catch (error) {
    console.error('[OfficeConverter] Conversion failed:', error);

    if (error instanceof Error) {
      if (error.message.includes('ENOENT') || error.message.includes('not found')) {
        throw new Error('LibreOffice (soffice) is not installed or not in PATH');
      }
      throw error;
    }

    throw new Error(`Office to PDF conversion failed: ${error}`);
  }
}

/**
 * Convert multiple Office documents to PDF
 */
export async function convertBatchToPdf(
  inputFiles: string[],
  outputDir: string
): Promise<Array<{ input: string; output: string; error?: string }>> {
  const results: Array<{ input: string; output: string; error?: string }> = [];

  for (const inputPath of inputFiles) {
    try {
      const outputPath = await convertToPdf(inputPath, outputDir);
      results.push({ input: inputPath, output: outputPath });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        input: inputPath,
        output: '',
        error: errorMessage,
      });
      console.error(`[OfficeConverter] Failed to convert ${inputPath}: ${errorMessage}`);
    }
  }

  return results;
}

/**
 * Get the installation status and path of LibreOffice
 */
export async function getLibreOfficeInfo(): Promise<{
  installed: boolean;
  version: string | null;
  path: string | null;
}> {
  try {
    const { stdout } = await execAsync('which soffice');
    const path = stdout.trim();

    try {
      const { stdout: versionOutput } = await execAsync('soffice --version');
      return {
        installed: true,
        version: versionOutput.trim(),
        path,
      };
    } catch {
      return {
        installed: true,
        version: null,
        path,
      };
    }
  } catch {
    return {
      installed: false,
      version: null,
      path: null,
    };
  }
}
