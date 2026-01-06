/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Creates a blob from the report content and triggers a download in the browser.
 * @param reportContent The string content of the test report.
 */
export const downloadTestReport = (reportContent: string) => {
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `agentic-ai-test-report-${timestamp}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
