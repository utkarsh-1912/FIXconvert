'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { convertFixXml } from './actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/logo';
import { Upload, FileJson, Copy, Download, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  xmlContent: z.string().min(10, { message: 'XML content must be provided.' }),
});

type FixDefinition = {
  version: string;
  header: number[];
  trailer: number[];
  fields: { tag: string; name: string; type: string }[];
  messages: {
    name: string;
    msgtype: string;
    category: string;
    fields: { tag: string; name: string; required: boolean }[];
  }[];
};

export default function Home() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ data: FixDefinition | null; error: string | null }>({
    data: null,
    error: null,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      xmlContent: '',
    },
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const content = await file.text();
      form.setValue('xmlContent', content);
    }
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      const res = await convertFixXml(values.xmlContent);
      setResult(res as { data: FixDefinition | null; error: string | null });
    });
  };

  const handleCopy = () => {
    if (!result.data) return;
    navigator.clipboard.writeText(JSON.stringify(result.data, null, 2));
    toast({ title: 'Success', description: 'JSON copied to clipboard.' });
  };

  const handleDownload = () => {
    if (!result.data) return;
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fix-definition.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleReset = () => {
    form.reset();
    setResult({ data: null, error: null });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="p-4 border-b">
        <div className="container mx-auto flex justify-between items-center">
          <Logo />
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-headline font-bold tracking-tight">
            QuickFIX XML to JSON Converter
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Instantly parse your QuickFIX data dictionary XML file into a clean, structured, and human-readable JSON format.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <Card className="shadow-lg">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Input FIX XML
                  </CardTitle>
                  <CardDescription>Upload a file, or paste the XML content directly into the text area below.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormItem>
                    <FormLabel>Upload File</FormLabel>
                    <FormControl>
                      <Input type="file" accept=".xml" onChange={handleFileChange} className="file:text-primary file:font-semibold" />
                    </FormControl>
                  </FormItem>
                  <FormField
                    control={form.control}
                    name="xmlContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>XML Content</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="<fix type=...>"
                            className="h-64 font-code text-xs"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button type="button" variant="outline" onClick={handleReset} disabled={isPending}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Reset
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? 'Converting...' : 'Convert'}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>

          <Card className="shadow-lg min-h-[500px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Output JSON
              </CardTitle>
              <CardDescription>The converted and structured FIX definition will appear here.</CardDescription>
            </CardHeader>
            <CardContent>
              {isPending && (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              )}
              {result.error && !isPending && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Conversion Failed</AlertTitle>
                  <AlertDescription>{result.error}</AlertDescription>
                </Alert>
              )}
              {result.data && !isPending && (
                <div className="relative">
                  <pre className="bg-muted rounded-md p-4 text-xs h-80 overflow-auto font-code">
                    <code>{JSON.stringify(result.data, null, 2)}</code>
                  </pre>
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button variant="ghost" size="icon" onClick={handleCopy}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleDownload}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
               {!result.data && !result.error && !isPending && (
                <div className="text-center text-muted-foreground p-8 flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                  <p>Your JSON output will be displayed here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground mt-8">
        Built with modern tools for reliable data processing.
      </footer>
    </div>
  );
}
