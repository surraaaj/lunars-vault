import React, { useState, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import {
    Upload, Zap, MessageSquare, Loader2,
    CheckCircle, Lock, Unlock, ChevronRight,
    Code2, PenLine, Cpu, AlertTriangle,
    Info, UploadCloud, Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    CONTRACT_ADDRESS, MARKETPLACE_ABI, MOCK_MODELS,
    uploadToDataHaven, type MockModel,
} from '@/lib/marketplace';
import { callGroq, type ChatMessage, type ModelPersona } from '@/lib/ai';

const MODEL_ICONS: Record<string, React.ReactNode> = {
    '1': <Code2 className="w-4 h-4" />,
    '2': <PenLine className="w-4 h-4" />,
    '3': <Cpu className="w-4 h-4" />,
};

const MODEL_PERSONAS: Record<string, ModelPersona> = {
    '1': 'code',
    '2': 'creative',
    '3': 'reasoning',
};

interface MarketplaceProps {
    isConnected: boolean;
    address: string | null;
    onConnect: () => void;
}

export function Marketplace({ isConnected, address, onConnect }: MarketplaceProps) {
    // Developer zone
    const [modelName, setModelName] = useState('');
    const [modelPrice, setModelPrice] = useState('');
    const [modelFile, setModelFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [listingHash, setListingHash] = useState('');
    const [listLoading, setListLoading] = useState(false);
    const [listSuccess, setListSuccess] = useState('');
    const [listError, setListError] = useState('');

    // Access / renting
    const [accessMap, setAccessMap] = useState<Record<string, boolean>>({});
    const [rentingId, setRentingId] = useState('');
    const [rentError, setRentError] = useState<Record<string, string>>({});

    // Chat
    const [chatPrompts, setChatPrompts] = useState<Record<string, string>>({});
    const [chatResponses, setChatResponses] = useState<Record<string, string>>({});
    const [chatLoading, setChatLoading] = useState<Record<string, boolean>>({});
    const chatHistory = useRef<Record<string, ChatMessage[]>>({});
    const [chatError, setChatError] = useState<Record<string, string>>({});

    const getContract = useCallback(async () => {
        const provider = new ethers.BrowserProvider(window.pelagus);
        const signer = await provider.getSigner();
        return new ethers.Contract(CONTRACT_ADDRESS, MARKETPLACE_ABI, signer);
    }, []);

    const handleListModel = async () => {
        setListError('');
        setListSuccess('');

        if (!address) { setListError('Connect your wallet first.'); return; }
        if (!modelName.trim()) { setListError('Model name is required.'); return; }
        if (!modelPrice || isNaN(Number(modelPrice)) || Number(modelPrice) <= 0) {
            setListError('Enter a valid price in QUAI.');
            return;
        }
        if (!modelFile) { setListError('Please upload a model file.'); return; }

        setListLoading(true);
        try {
            setUploadStatus('Uploading to DataHaven...');
            const dhHash = await uploadToDataHaven(modelFile);
            setListingHash(dhHash);
            setUploadStatus(`Uploaded · ${dhHash.slice(0, 28)}...`);
            setUploadStatus('Waiting for Pelagus confirmation...');

            const contract = await getContract();
            const tx = await contract.listModel(
                dhHash,
                modelName.trim(),
                ethers.parseEther(modelPrice),
            );
            setUploadStatus('Confirming transaction...');
            await tx.wait();

            setListSuccess(`"${modelName}" listed on Quai Network.`);
            setModelName('');
            setModelPrice('');
            setModelFile(null);
            setUploadStatus('');
            setListingHash('');
        } catch (err: unknown) {
            const e = err as { code?: string; message?: string };
            let errorMsg = e.message || 'Listing failed.';
            if (e.code === 'ACTION_REJECTED') errorMsg = 'Rejected in Pelagus.';
            else if (e.message?.includes('insufficient funds')) errorMsg = 'Insufficient QUAI for gas.';
            setListError(errorMsg);
            setUploadStatus('');
        } finally {
            setListLoading(false);
        }
    };

    const handleRentModel = async (model: MockModel) => {
        setRentError(prev => ({ ...prev, [model.id]: '' }));
        if (!address) {
            setRentError(prev => ({ ...prev, [model.id]: 'Connect your wallet first.' }));
            return;
        }
        setRentingId(model.id);
        try {
            const contract = await getContract();
            const alreadyHas = await contract.hasAccess(address, model.dataHavenHash);
            if (alreadyHas) {
                setAccessMap(prev => ({ ...prev, [model.id]: true }));
                return;
            }
            const tx = await contract.rentModel(model.dataHavenHash, { value: model.priceWei });
            await tx.wait();
            setAccessMap(prev => ({ ...prev, [model.id]: true }));
        } catch (err: unknown) {
            const e = err as { code?: string; message?: string };
            if (e.message?.includes('Already has access')) {
                setAccessMap(prev => ({ ...prev, [model.id]: true }));
                return;
            }
            let errorMsg = e.message || 'Rent failed.';
            if (e.code === 'ACTION_REJECTED') errorMsg = 'Rejected in Pelagus.';
            else if (e.message?.includes('insufficient funds')) errorMsg = 'Insufficient QUAI balance.';
            setRentError(prev => ({ ...prev, [model.id]: errorMsg }));
        } finally {
            setRentingId('');
        }
    };

    const handleGenerate = async (modelId: string, model: MockModel) => {
        const prompt = chatPrompts[modelId];
        if (!prompt?.trim()) return;

        setChatError(prev => ({ ...prev, [modelId]: '' }));
        setChatLoading(prev => ({ ...prev, [modelId]: true }));
        setChatResponses(prev => ({ ...prev, [modelId]: '' }));

        try {
            if (address) {
                try {
                    const contract = await getContract();
                    const stillHas = await contract.hasAccess(address, model.dataHavenHash);
                    if (!stillHas) {
                        setAccessMap(prev => ({ ...prev, [modelId]: false }));
                        throw new Error('On-chain access revoked. Please rent again.');
                    }
                } catch (verifyErr: unknown) {
                    const ve = verifyErr as { message?: string };
                    if (ve.message?.includes('access revoked')) throw verifyErr;
                    console.warn('hasAccess check skipped (network mismatch):', ve.message);
                }
            }

            const history = chatHistory.current[modelId] ?? [];
            const userMsg: ChatMessage = { role: 'user', content: prompt };
            const updatedHistory = [...history, userMsg];

            let full = '';
            const persona = MODEL_PERSONAS[modelId] ?? 'reasoning';

            await callGroq(persona, updatedHistory, (chunk) => {
                full += chunk;
                setChatResponses(prev => ({ ...prev, [modelId]: full }));
            });

            chatHistory.current[modelId] = [
                ...updatedHistory,
                { role: 'assistant', content: full },
            ];

            setChatPrompts(prev => ({ ...prev, [modelId]: '' }));
        } catch (err: unknown) {
            const e = err as { message?: string };
            setChatError(prev => ({ ...prev, [modelId]: e.message || 'Generation failed.' }));
        } finally {
            setChatLoading(prev => ({ ...prev, [modelId]: false }));
        }
    };

    return (
        <section className="py-20 bg-background">
            <div className="max-w-4xl mx-auto px-6 space-y-14">

                {/* Section Header */}
                <div>
                    <h2 className="text-2xl font-bold text-foreground mb-1">AI Model Marketplace</h2>
                    <p className="text-sm text-muted-foreground">
                        Rent access to on-chain AI models. Pay micro-transactions in QUAI.
                    </p>
                </div>

                {/* Not connected */}
                {!isConnected && (
                    <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border border-border">
                        <p className="text-sm text-muted-foreground">Connect Pelagus to rent or list models</p>
                        <Button
                            onClick={onConnect}
                            size="sm"
                            className="rounded-lg px-4 text-xs font-medium bg-foreground text-background hover:bg-foreground/80"
                        >
                            Connect Pelagus
                        </Button>
                    </div>
                )}

                {/* ── STOREFRONT ── */}
                <div>
                    <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-foreground">Available Models</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Pay once, prompt securely. Verifiable inference on the Quai Network.
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted border border-border text-xs font-medium text-muted-foreground">
                            <CheckCircle className="w-3.5 h-3.5" />
                            On-Chain Verified
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        {MOCK_MODELS.map((model) => {
                            const hasAccess = accessMap[model.id];
                            const isRenting = rentingId === model.id;
                            const err = rentError[model.id];

                            return (
                                <div
                                    key={model.id}
                                    className="rounded-lg border border-border bg-card overflow-hidden transition-colors hover:border-foreground/30"
                                >
                                    <div className="p-5 flex flex-col h-full">
                                        {!hasAccess ? (
                                            /* Locked */
                                            <div className="flex flex-col h-full">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center text-foreground">
                                                        {MODEL_ICONS[model.id]}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted border border-border text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                                                        <Lock className="w-3 h-3" /> Locked
                                                    </div>
                                                </div>

                                                <div className="mb-4">
                                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold text-muted-foreground bg-muted uppercase tracking-widest mb-2">
                                                        {model.category}
                                                    </span>
                                                    <h4 className="text-base font-semibold text-foreground mb-1.5">{model.name}</h4>
                                                    <p className="text-sm text-muted-foreground leading-relaxed min-h-[56px]">
                                                        {model.description}
                                                    </p>
                                                </div>

                                                <div className="mb-4 mt-auto">
                                                    <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">DataHaven Hash</p>
                                                    <code className="text-[11px] text-muted-foreground bg-muted border border-border px-2 py-1 rounded block truncate font-mono">
                                                        {model.dataHavenHash}
                                                    </code>
                                                </div>

                                                <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-border">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</span>
                                                        <div className="text-right">
                                                            <span className="text-lg font-bold text-foreground leading-none">{model.priceQuai}</span>
                                                            <span className="text-muted-foreground text-xs ml-1">QUAI</span>
                                                        </div>
                                                    </div>

                                                    {err && (
                                                        <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20">
                                                            <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                                                            <span className="text-xs text-destructive">{err}</span>
                                                        </div>
                                                    )}

                                                    <Button
                                                        onClick={() => handleRentModel(model)}
                                                        disabled={isRenting || !isConnected}
                                                        className="w-full rounded-lg h-10 text-sm font-medium bg-foreground text-background hover:bg-foreground/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isRenting ? (
                                                            <span className="flex items-center gap-2">
                                                                <Loader2 className="w-4 h-4 spinner" /> Confirming...
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center justify-center gap-2">
                                                                <Zap className="w-4 h-4" /> Rent Access
                                                            </span>
                                                        )}
                                                    </Button>

                                                    {!isConnected && (
                                                        <p className="text-[10px] text-muted-foreground text-center">
                                                            Connect wallet to rent
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            /* Unlocked / Chat */
                                            <div className="flex flex-col h-full">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center text-foreground">
                                                            {MODEL_ICONS[model.id]}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-foreground leading-tight">{model.name}</h4>
                                                            <span className="text-[11px] text-muted-foreground font-mono">Llama-3.3-70b</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted border border-border text-[10px] text-foreground uppercase tracking-wider font-medium">
                                                        <Unlock className="w-3 h-3" /> Ready
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted border border-border mb-4">
                                                    <CheckCircle className="w-3.5 h-3.5 text-foreground shrink-0" />
                                                    <span className="text-xs text-muted-foreground">Verified on Quai Network</span>
                                                </div>

                                                {chatError[model.id] && (
                                                    <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20 mb-3">
                                                        <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                                                        <span className="text-xs text-destructive">{chatError[model.id]}</span>
                                                    </div>
                                                )}

                                                <div className="flex-1 flex flex-col justify-end">
                                                    {(chatResponses[model.id] || chatLoading[model.id]) && (
                                                        <div className="mb-3 p-3 rounded-md bg-muted border border-border text-sm text-foreground leading-relaxed whitespace-pre-wrap min-h-[72px] max-h-[160px] overflow-y-auto">
                                                            {chatLoading[model.id] && !chatResponses[model.id] ? (
                                                                <span className="flex items-center gap-2 text-muted-foreground">
                                                                    <Loader2 className="w-4 h-4 spinner" /> Computing...
                                                                </span>
                                                            ) : (
                                                                <div className="text-foreground/90">
                                                                    {chatResponses[model.id]}
                                                                    {chatLoading[model.id] && (
                                                                        <span className="inline-block w-1.5 h-4 bg-foreground ml-1 translate-y-[2px] animate-pulse" />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="relative mt-auto">
                                                        <textarea
                                                            rows={2}
                                                            value={chatPrompts[model.id] || ''}
                                                            onChange={(e) => setChatPrompts(prev => ({ ...prev, [model.id]: e.target.value }))}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    handleGenerate(model.id, model);
                                                                }
                                                            }}
                                                            placeholder="Ask the model anything..."
                                                            className="w-full pl-3 pr-11 py-2.5 rounded-md bg-background border border-border text-sm text-foreground placeholder-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-foreground/20"
                                                        />
                                                        <Button
                                                            onClick={() => handleGenerate(model.id, model)}
                                                            disabled={chatLoading[model.id] || !chatPrompts[model.id]?.trim()}
                                                            size="icon"
                                                            className={`absolute right-1.5 bottom-1.5 rounded-md w-7 h-7 ${chatPrompts[model.id]?.trim() && !chatLoading[model.id]
                                                                    ? 'bg-foreground text-background hover:bg-foreground/80'
                                                                    : 'bg-muted text-muted-foreground'
                                                                }`}
                                                        >
                                                            {chatLoading[model.id] ? (
                                                                <Loader2 className="w-3.5 h-3.5 spinner" />
                                                            ) : (
                                                                <MessageSquare className="w-3.5 h-3.5" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── DEVELOPER ZONE ── */}
                <div>
                    <div className="mb-8">
                        <h3 className="text-xl font-bold text-foreground">List a Model</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Earn QUAI on every access. Set up your smart contract listing in seconds.
                        </p>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-6">
                        <div className="grid md:grid-cols-2 gap-8">

                            {/* Form */}
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="modelName" className="text-xs font-medium text-muted-foreground">Model Name</Label>
                                    <Input
                                        id="modelName"
                                        value={modelName}
                                        onChange={(e) => setModelName(e.target.value)}
                                        placeholder="e.g., Llama-3.3-70b-instruct"
                                        className="h-9 rounded-md text-sm"
                                        required
                                        disabled={listLoading}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="priceQuai" className="text-xs font-medium text-muted-foreground">Price (QUAI)</Label>
                                        <div className="relative">
                                            <Input
                                                id="priceQuai"
                                                type="number"
                                                inputMode="decimal"
                                                step="0.001"
                                                min="0"
                                                value={modelPrice}
                                                onChange={(e) => setModelPrice(e.target.value)}
                                                placeholder="0.05"
                                                className="h-9 rounded-md pr-12 text-right font-mono text-sm"
                                                required
                                                disabled={listLoading}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">QUAI</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="dataHavenHash" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                        DataHaven Hash
                                        <Info className="w-3 h-3 text-muted-foreground/50" />
                                    </Label>
                                    <Input
                                        id="dataHavenHash"
                                        value={listingHash}
                                        readOnly
                                        placeholder="Auto-generated after upload"
                                        className="h-9 rounded-md font-mono text-sm bg-muted"
                                        disabled={listLoading}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                        Model weights file <span className="text-foreground">*</span>
                                    </label>
                                    <label
                                        className={`flex flex-col items-center justify-center h-20 rounded-md border border-dashed cursor-pointer transition-colors ${modelFile
                                                ? 'border-foreground/30 bg-muted/50'
                                                : 'border-border bg-muted/20 hover:border-foreground/20 hover:bg-muted/40'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <Upload className="w-4 h-4 text-muted-foreground" />
                                            {modelFile ? (
                                                <span className="text-xs text-foreground font-medium">{modelFile.name}</span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Click to upload</span>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => setModelFile(e.target.files?.[0] || null)}
                                            disabled={listLoading}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Info + Status + Submit */}
                            <div className="space-y-4">
                                <div className="p-4 rounded-md bg-muted/40 border border-border">
                                    <h4 className="text-xs font-medium text-foreground mb-3 flex items-center gap-1.5">
                                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                        How it works
                                    </h4>
                                    <ol className="space-y-2">
                                        {[
                                            <>File uploaded to <strong className="text-foreground">DataHaven</strong> → hash returned</>,
                                            <>Hash + price stored on <strong className="text-foreground">Quai Network</strong> contract</>,
                                            <>Users pay QUAI to access. Earnings go to your wallet</>,
                                        ].map((step, i) => (
                                            <li key={i} className="flex gap-2.5 text-xs text-muted-foreground">
                                                <span className="w-4 h-4 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-medium text-foreground shrink-0 mt-0.5">
                                                    {i + 1}
                                                </span>
                                                <span className="leading-relaxed">{step}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>

                                {uploadStatus && (
                                    <div className="flex items-center gap-2 p-3 rounded-md bg-muted/40 border border-border">
                                        <Loader2 className="w-3.5 h-3.5 spinner text-muted-foreground shrink-0" />
                                        <span className="text-xs text-muted-foreground">{uploadStatus}</span>
                                    </div>
                                )}
                                {listingHash && !uploadStatus && (
                                    <div className="p-3 rounded-md bg-muted/40 border border-border">
                                        <p className="text-[10px] text-muted-foreground mb-1">DataHaven hash</p>
                                        <code className="text-xs text-foreground break-all">{listingHash}</code>
                                    </div>
                                )}
                                {listError && (
                                    <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                                        <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                                        <span className="text-xs text-destructive">{listError}</span>
                                    </div>
                                )}
                                {listSuccess && (
                                    <div className="flex items-start gap-2 p-3 rounded-md bg-muted border border-border">
                                        <CheckCircle className="w-3.5 h-3.5 text-foreground shrink-0 mt-0.5" />
                                        <span className="text-xs text-foreground">{listSuccess}</span>
                                    </div>
                                )}

                                <Button
                                    onClick={handleListModel}
                                    disabled={listLoading || !isConnected}
                                    className="w-full rounded-lg h-10 text-sm font-medium bg-foreground text-background hover:bg-foreground/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {listLoading ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 spinner" /> Listing...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <UploadCloud className="w-4 h-4" /> Submit to Registry
                                        </span>
                                    )}
                                </Button>

                                {!isConnected && (
                                    <p className="text-[10px] text-muted-foreground text-center">Connect wallet to list a model</p>
                                )}

                                {!isConnected && !listLoading && (
                                    <div className="hidden md:flex flex-col justify-center items-center p-6 bg-muted/30 rounded-md border border-dashed border-border text-center">
                                        <div className="w-14 h-14 bg-background rounded-lg flex items-center justify-center mb-4 border border-border">
                                            <Database className="w-6 h-6 text-foreground" />
                                        </div>
                                        <h4 className="text-sm font-semibold text-foreground mb-1.5">DataHaven Secured</h4>
                                        <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">
                                            Model weights are immutably stored on DataHaven. The smart contract ensures fair compensation per inference.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}
