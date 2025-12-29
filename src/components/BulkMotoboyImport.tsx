import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { Unidade } from '@/lib/api';
import { createEntregador } from '@/lib/api';

interface BulkMotoboyImportProps {
  unidade: Unidade;
}

interface ParsedRow {
  nome: string;
  telefone: string;
}

export function BulkMotoboyImport({ unidade }: BulkMotoboyImportProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const importMutation = useMutation({
    mutationFn: async (rows: ParsedRow[]) => {
      for (const row of rows) {
        const nome = row.nome?.toString().trim();
        const telefone = row.telefone?.toString().replace(/\D/g, '');
        if (!nome || !telefone) continue;
        await createEntregador({
          nome,
          telefone,
          unidade,
          status: 'disponivel',
          ativo: true,
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      toast.success('Motoboys importados com sucesso');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erro ao importar motoboys');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const parseCSV = async (text: string): Promise<ParsedRow[]> => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());
    const nomeIdx = headers.findIndex((h) => h === 'nome' || h === 'name');
    const telIdx = headers.findIndex((h) => h === 'telefone' || h === 'celular' || h === 'phone');

    if (nomeIdx === -1 || telIdx === -1) {
      throw new Error('Cabeçalhos esperados: nome, telefone');
    }

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter);
      if (!cols.length) continue;
      rows.push({ nome: cols[nomeIdx] || '', telefone: cols[telIdx] || '' });
    }
    return rows;
  };

  const parseXLS = async (file: File): Promise<ParsedRow[]> => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

    const rows: ParsedRow[] = json.map((row) => ({
      nome: row.nome || row.Nome || row.NAME || row.name || '',
      telefone: row.telefone || row.Telefone || row.Celular || row.celular || row.PHONE || row.phone || '',
    }));

    return rows;
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Selecione um arquivo CSV ou XLS/XLSX');
      return;
    }

    setIsImporting(true);
    try {
      let rows: ParsedRow[] = [];
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'csv') {
        const text = await file.text();
        rows = await parseCSV(text);
      } else if (ext === 'xls' || ext === 'xlsx') {
        rows = await parseXLS(file);
      } else {
        throw new Error('Formato não suportado. Use CSV, XLS ou XLSX.');
      }

      if (!rows.length) {
        toast.error('Nenhuma linha válida encontrada no arquivo');
        return;
      }

      await importMutation.mutateAsync(rows);
      setFile(null);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Erro ao processar arquivo');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const header = 'nome;telefone';
    const example = '\nJoão Motoboy;11999999999';
    const blob = new Blob([header + example], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_motoboys.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <Label className="text-sm font-mono">Importar motoboys em lote</Label>
          <p className="text-xs text-muted-foreground max-w-md">
            Importe um arquivo CSV ou Excel com colunas <strong>nome</strong> e <strong>telefone</strong>.
            Os motoboys serão criados somente para a unidade atual.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <Input
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={handleFileChange}
            className="sm:w-64"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate}>
            Baixar modelo CSV
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleImport}
            disabled={!file || isImporting}
          >
            {isImporting ? 'Importando...' : 'Importar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
