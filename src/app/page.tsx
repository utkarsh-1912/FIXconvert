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
import { Upload, FileJson, Copy, Download, AlertCircle, RefreshCw, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  xmlContent: z.string().min(10, { message: 'XML content must be provided.' }),
});

type FixFieldValue = {
  enum: string;
  description: string;
};

type FixField = {
  tag: string;
  name: string;
  type: string;
  values?: FixFieldValue[];
};

type FixDefinition = {
  version: string;
  header: number[];
  trailer: number[];
  fields: FixField[];
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
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="p-4 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <Logo />
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-headline font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary/90 to-primary">
            QuickFIX to JSON
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-lg">
            Instantly parse your QuickFIX data dictionary XML into clean, structured JSON.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Input Card */}
          <Card className="shadow-lg bg-card/80 border-border/60">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Upload />
                    Input FIX XML
                  </CardTitle>
                  <CardDescription>Upload a file or paste content directly.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormItem>
                    <FormLabel className="sr-only">Upload File</FormLabel>
                    <FormControl>
                      <Input 
                        type="file" 
                        accept=".xml" 
                        onChange={handleFileChange} 
                        className="file:text-primary file:font-semibold bg-input/50" 
                      />
                    </FormControl>
                  </FormItem>
                  <Separator />
                  <FormField
                    control={form.control}
                    name="xmlContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>XML Content</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="<fix>...</fix>"
                            className="h-80 font-code text-sm bg-input/50 focus:bg-input"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex justify-between p-4 bg-card/50 border-t mt-2">
                  <Button type="button" variant="ghost" onClick={handleReset} disabled={isPending}>
                    <RefreshCw /> Reset
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    <Wand2 />
                    {isPending ? 'Converting...' : 'Convert'}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>

          {/* Output Card */}
          <Card className="shadow-lg sticky top-24 bg-card/80 border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileJson />
                Output JSON
              </CardTitle>
              <CardDescription>The converted FIX definition will appear here.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[440px] flex flex-col">
              {isPending && (
                <div className="space-y-4 p-4">
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              )}
              {result.error && !isPending && (
                <Alert variant="destructive" className="m-4">
                  <AlertCircle />
                  <AlertTitle>Conversion Failed</AlertTitle>
                  <AlertDescription>{result.error}</AlertDescription>
                </Alert>
              )}
              {result.data && !isPending && (
                <div className="relative flex-1 flex flex-col">
                  <div className="absolute top-2 right-2 z-10 flex gap-1">
                    <Button variant="ghost" size="icon" onClick={handleCopy} title="Copy JSON">
                      <Copy />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleDownload} title="Download JSON">
                      <Download />
                    </Button>
                  </div>
                  <pre className="bg-muted/50 rounded-md p-4 text-xs h-full overflow-auto font-code flex-1">
                    <code>{JSON.stringify(result.data, null, 2)}</code>
                  </pre>
                </div>
              )}
               {!result.data && !result.error && !isPending && (
                <div className="text-center text-muted-foreground p-8 flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg m-4">
                  <FileJson className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <p className="text-lg font-medium">JSON Output</p>
                  <p>Your result will be displayed here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground mt-16">
        Built with modern tools for reliable data processing.
      </footer>
    </div>
  );
}
