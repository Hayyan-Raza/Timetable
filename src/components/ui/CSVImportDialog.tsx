import React, { useState, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './dialog';
import { Button } from './button';
import { Alert, AlertDescription } from './alert';
import { Upload, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface CSVImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    onImport: (file: File) => Promise<{ success: boolean; message: string; errors?: string[] }>;
    onDownloadSample: () => void;
    sampleFileName: string;
}

export function CSVImportDialog({
    open,
    onOpenChange,
    title,
    description,
    onImport,
    onDownloadSample,
    sampleFileName
}: CSVImportDialogProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; errors?: string[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'text/csv') {
            setSelectedFile(file);
            setResult(null);
        } else if (file) {
            setResult({
                success: false,
                message: 'Please select a valid CSV file',
                errors: []
            });
        }
    };

    const handleImport = async () => {
        if (!selectedFile) return;

        setImporting(true);
        setResult(null);

        try {
            const importResult = await onImport(selectedFile);
            setResult(importResult);

            if (importResult.success) {
                // Clear file selection on success
                setSelectedFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }

                // Auto-close dialog after 2 seconds on success
                setTimeout(() => {
                    onOpenChange(false);
                    setResult(null);
                }, 2000);
            }
        } catch (error) {
            setResult({
                success: false,
                message: `Import failed: ${(error as Error).message}`,
                errors: []
            });
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Sample CSV Download */}
                    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <div>
                                <p className="text-sm font-medium text-blue-900">Need a template?</p>
                                <p className="text-xs text-blue-700">Download a sample CSV file to see the required format</p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onDownloadSample}
                            className="border-blue-300 text-blue-700 hover:bg-blue-100"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            {sampleFileName}
                        </Button>
                    </div>

                    {/* File Upload */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Select CSV File</label>
                        <div className="flex items-center gap-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleFileSelect}
                                className="flex-1 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                            />
                        </div>
                        {selectedFile && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                            </p>
                        )}
                    </div>

                    {/* Result Messages */}
                    {result && (
                        <Alert variant={result.success ? 'default' : 'destructive'}>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <p className="font-medium">{result.message}</p>
                                {result.errors && result.errors.length > 0 && (
                                    <ul className="mt-2 text-xs space-y-1 list-disc list-inside">
                                        {result.errors.slice(0, 5).map((error, i) => (
                                            <li key={i}>{error}</li>
                                        ))}
                                        {result.errors.length > 5 && (
                                            <li className="text-slate-500">... and {result.errors.length - 5} more errors</li>
                                        )}
                                    </ul>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={importing}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!selectedFile || importing}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {importing ? (
                            <>
                                <span className="animate-spin mr-2">⏳</span>
                                Importing...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4 mr-2" />
                                Import Data
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
