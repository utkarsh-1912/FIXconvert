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
import { Logo } from '@/components/logo';
import { Upload, FileJson, Copy, Download, AlertCircle, RefreshCw, Wand2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [stage, setStage] = useState<'input' | 'output'>('input');
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
      // Automatically trigger conversion after file selection for a smoother flow.
      startTransition(async () => {
        const res = await convertFixXml(content);
        setResult(res as { data: FixDefinition | null; error: string | null });
        if (res.data) {
          setStage('output');
        }
      });
    }
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      const res = await convertFixXml(values.xmlContent);
      setResult(res as { data: FixDefinition | null; error: string | null });
       if (res.data) {
        setStage('output');
      }
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
    setStage('input');
  };

  const renderInputStage = () => (
    <div className="w-full max-w-2xl mx-auto">
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
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                  <TabsTrigger value="paste">Paste Content</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="pt-4">
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
                </TabsContent>
                <TabsContent value="paste" className="pt-4">
                  <FormField
                    control={form.control}
                    name="xmlContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">XML Content</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="<fix>...</fix>"
                            className="h-64 font-code text-sm bg-input/50 focus:bg-input"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between p-4 bg-card/50 border-t">
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
      {result.error && !isPending && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle />
          <AlertTitle>Conversion Failed</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderOutputStage = () => (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
      {/* Input Card */}
       <div className="flex flex-col gap-4">
         <Button variant="outline" onClick={handleReset} className="self-start">
            <ArrowLeft /> Start New Conversion
        </Button>
        <Card className="shadow-lg bg-card/80 border-border/60">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Upload />
                    Input FIX XML
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="xmlContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="<fix>...</fix>"
                            className="h-64 font-code text-sm bg-input/50 focus:bg-input"
                            {...field}
                            readOnly
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </form>
            </Form>
          </Card>
      </div>

      {/* Output Card */}
      <Card className="shadow-lg bg-card/80 border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileJson />
            Output JSON
          </CardTitle>
          <CardDescription>The converted FIX definition.</CardDescription>
        </CardHeader>
        <CardContent>
          {result.data && !isPending && (
            <div className="relative">
              <div className="absolute top-2 right-2 z-10 flex gap-1">
                <Button variant="ghost" size="icon" onClick={handleCopy} title="Copy JSON">
                  <Copy />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleDownload} title="Download JSON">
                  <Download />
                </Button>
              </div>
              <pre className="bg-muted/50 rounded-md p-4 text-xs h-96 overflow-auto font-code">
                <code>{JSON.stringify(result.data, null, 2)}</code>
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
  
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
        
        {stage === 'input' ? renderInputStage() : renderOutputStage()}

      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground mt-16">
        Built with modern tools for reliable data processing.
      </footer>
    </div>
  );
}
