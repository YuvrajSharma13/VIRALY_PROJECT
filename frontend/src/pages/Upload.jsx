import { useMemo, useRef, useState, useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const inputTabs = [
  ['youtube', 'YouTube URL', 'Analyze a public video with your added context'],
  ['document', 'Document, transcript, or blog', 'Upload a file or paste source content'],
  ['raw', 'Raw text request', 'Ask VIRALY to create content in any form'],
];
const outputFormats = [
  ['answer', 'Answer my question'], ['reel', 'Reel hooks'], ['script', 'Short script'],
  ['linkedin', 'LinkedIn post'], ['twitter', 'X thread'], ['instagram', 'Instagram caption'], ['hashtags', 'Hashtags'],
];
const tones = ['Professional', 'Casual', 'Bold', 'Educational'];

function splitSections(content) {
  const sections = content.split(/(?=^##\s+)/m).filter(Boolean);
  return sections.length ? sections : [content];
}

export default function Upload() {
  const context = useOutletContext() || {};
  const location = useLocation();
  const prefill = location.state || {};
  const { user, currentUser, userId: contextUserId } = context;

  // Resolve active userId from context or localStorage fallback
  const activeUserId = contextUserId || user?.uid || user?.email || currentUser?.uid || currentUser?.email || localStorage.getItem("userId") || localStorage.getItem("userEmail") || "user_default";

  const [tab, setTab] = useState(prefill.initialTab || (prefill.prefilledPrompt ? 'raw' : 'youtube'));
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [rawRequest, setRawRequest] = useState(prefill.prefilledPrompt || '');
  const [document, setDocument] = useState(null);
  const [formats, setFormats] = useState(prefill.prefilledFormat ? [prefill.prefilledFormat] : ['answer', 'reel']);
  const [tone, setTone] = useState(prefill.prefilledTone || 'Professional');
  const [youtubeContext, setYoutubeContext] = useState('');
  const [documentContext, setDocumentContext] = useState('');
  const [output, setOutput] = useState('');
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    if (prefill.prefilledPrompt) {
      setRawRequest(prefill.prefilledPrompt);
      setTab('raw');
      if (prefill.prefilledFormat) {
        setFormats([prefill.prefilledFormat]);
      }
    }
  }, [prefill]);

  const sourceReady = tab === 'youtube' ? youtubeUrl.trim() : tab === 'document' ? Boolean(document?.content || documentText.trim()) : rawRequest.trim();
  const sourceLabel = useMemo(() => tab === 'youtube' ? 'YouTube video' : tab === 'document' ? document?.name || 'Document source' : 'Raw request', [tab, document]);

  function toggleFormat(format) {
    setFormats((current) => current.includes(format) ? current.filter((item) => item !== format) : [...current, format]);
  }

  function readDocument(file) {
    if (!file) return;
    const supported = ['application/pdf', 'text/plain'];
    if (!supported.includes(file.type) && !/\.(pdf|txt)$/i.test(file.name)) {
      setError('Please choose a PDF or TXT document.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Please use a document smaller than 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDocument({ name: file.name, type: file.type, content: reader.result });
      setError('');
    };
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) reader.readAsDataURL(file);
    else reader.readAsText(file);
  }

  async function generate() {
    if (!sourceReady || !formats.length) return;
    setIsGenerating(true);
    setError('');
    setOutput('');
    setMeta(null);
    setCopied(false);
    const sourceInput = tab === 'youtube' ? youtubeUrl.trim() : tab === 'document' ? document?.content || documentText.trim() : rawRequest.trim();
    const sourceType = tab === 'document' && document && (document.type === 'application/pdf' || /\.pdf$/i.test(document.name)) ? 'pdf' : tab === 'youtube' ? 'youtube' : 'text';
    const customInstructions = tab === 'youtube' ? youtubeContext : tab === 'document' ? documentContext : rawRequest;
    try {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: activeUserId, 
          sourceInput, 
          sourceType, 
          customInstructions, 
          formats, 
          tone 
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Generation failed. Please try again.');
      setOutput(result.content);
      setMeta(result.meta);
    } catch (requestError) {
      setError(requestError.message.includes('Failed to fetch') ? 'Cannot reach the API. Start the backend on port 5000 and try again.' : requestError.message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return <div className="viraly-upload">
    <style>{styles}</style>
    <section className="upload-hero">
      <span className="eyebrow">VIRALY STUDIO</span>
      <h2>Turn one idea into content everywhere.</h2>
      <p>Bring a public YouTube video, text, or document. Tell VIRALY exactly what you need.</p>
    </section>

    <div className="studio-grid">
      <main className="source-card">
        <div className="tabs" role="tablist">
          {inputTabs.map(([id, label]) => <button key={id} type="button" className={tab === id ? 'tab active' : 'tab'} onClick={() => { setTab(id); setError(''); }}><span>{label}</span><small>{id === tab ? 'Selected' : ''}</small></button>)}
        </div>

        <div className="source-body">
          <div className="field-title"><span className="step">01</span><div><h3>{inputTabs.find(([id]) => id === tab)[1]}</h3><p>{inputTabs.find(([id]) => id === tab)[2]}</p></div></div>
          {tab === 'youtube' && <div className="field"><label>Public YouTube URL</label><input value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." autoComplete="off" /><span className="field-note">Gemini analyzes the video itself, including visual and spoken content.</span></div>}
          {tab === 'youtube' && <div className="field instruction"><div className="label-row"><label>Additional context or request</label><span>Optional but powerful</span></div><textarea value={youtubeContext} onChange={(event) => setYoutubeContext(event.target.value)} placeholder="Example: Focus on the biggest lessons for startup founders, then write five practical Reel hooks." rows={5} /></div>}
          {tab === 'document' && <>
            <div className="document-drop" onClick={() => fileInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); readDocument(event.dataTransfer.files[0]); }}>
              <input ref={fileInput} type="file" accept=".pdf,.txt,application/pdf,text/plain" onChange={(event) => readDocument(event.target.files[0])} hidden />
              {document ? <><strong>{document.name}</strong><span>Ready to analyze · choose another file</span></> : <><strong>Drop a PDF or TXT file here</strong><span>or click to browse · maximum 10 MB</span></>}
            </div>
            <div className="or-divider"><span>OR PASTE YOUR CONTENT</span></div>
            <div className="field"><label>Transcript, blog, or document text</label><textarea value={documentText} onChange={(event) => setDocumentText(event.target.value)} placeholder="Paste a transcript, blog article, notes, or any document text…" rows={9} /><span className="field-note">{documentText.length.toLocaleString()} characters</span></div>
            <div className="field instruction"><div className="label-row"><label>Additional context or request</label><span>Optional</span></div><textarea value={documentContext} onChange={(event) => setDocumentContext(event.target.value)} placeholder="Example: Extract the strongest ideas and create a short LinkedIn post." rows={4} /></div>
          </>}
          {tab === 'raw' && <div className="field raw-request"><label>What do you want VIRALY to create?</label><textarea value={rawRequest} onChange={(event) => setRawRequest(event.target.value)} placeholder="Example: Write a bold 30-second Reel script about why small businesses should use AI automation. Include a strong hook and call to action." rows={11} /><span className="field-note">Describe the topic, audience, angle, and desired result. Then select the content formats on the right.</span></div>}
        </div>
      </main>

      <aside className="controls-card">
        <div className="field-title"><span className="step">02</span><div><h3>Choose outcomes</h3><p>Pick one or more deliverables.</p></div></div>
        <div className="format-grid">{outputFormats.map(([id, label]) => <button key={id} type="button" onClick={() => toggleFormat(id)} className={formats.includes(id) ? 'format selected' : 'format'}><span>{formats.includes(id) ? '✓' : '+'}</span>{label}</button>)}</div>
        <div className="tone-row"><label>Tone</label><div>{tones.map((item) => <button type="button" key={item} onClick={() => setTone(item)} className={tone === item ? 'tone active' : 'tone'}>{item}</button>)}</div></div>
        <button type="button" className="generate" onClick={generate} disabled={!sourceReady || !formats.length || isGenerating}>{isGenerating ? 'Analyzing your source…' : 'Generate with VIRALY'}<span>→</span></button>
        <p className="privacy-note">Your API key remains on the server. Public YouTube videos only.</p>
      </aside>
    </div>

    {error && <div className="error-card"><strong>We could not generate this yet.</strong><span>{error}</span></div>}
    {(output || isGenerating) && <section className="result-card">
      <header><div><span className="eyebrow">GENERATED OUTPUT</span><h3>{isGenerating ? 'VIRALY is working…' : 'Your content is ready'}</h3><p>{isGenerating ? `Analyzing ${sourceLabel.toLowerCase()}` : `${meta?.formats?.length || formats.length} deliverable${(meta?.formats?.length || formats.length) === 1 ? '' : 's'} · ${meta?.latency ? `${(meta.latency / 1000).toFixed(1)}s` : sourceLabel}`}</p></div>{output && <button type="button" className="copy" onClick={copyOutput}>{copied ? 'Copied' : 'Copy all'}</button>}</header>
      {isGenerating ? <div className="skeleton"><i /><i /><i /></div> : <div className="result-sections">{splitSections(output).map((section, index) => <article key={index}><pre>{section.replace(/^##\s+/, '')}</pre></article>)}</div>}
    </section>}
  </div>;
}

const styles = `
  .viraly-upload{max-width:1240px;margin:0 auto 56px;color:#17121f;font-family:'Plus Jakarta Sans',sans-serif}.upload-hero{max-width:680px;margin:0 0 30px}.eyebrow{display:block;color:#7c3aed;font-size:11px;letter-spacing:.13em;font-weight:800}.upload-hero h2{font-family:Georgia,serif;font-size:42px;line-height:1.08;letter-spacing:-.045em;margin:9px 0 10px}.upload-hero p,.field-title p,.privacy-note,.result-card header p{margin:0;color:#726b79;font-size:14px;line-height:1.55}.studio-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(300px,.8fr);gap:20px;align-items:start}.source-card,.controls-card,.result-card,.error-card{background:rgba(255,255,255,.88);border:1px solid #e8e2ee;border-radius:20px;box-shadow:0 18px 45px rgba(54,28,77,.06)}.tabs{display:flex;gap:4px;padding:8px;border-bottom:1px solid #eee8f2}.tab{flex:1;min-height:56px;padding:9px 12px;border:0;border-radius:12px;background:transparent;color:#70677a;font:inherit;text-align:left;cursor:pointer}.tab span{display:block;font-size:13px;font-weight:750}.tab small{display:block;margin-top:3px;color:#a69baa;font-size:10px}.tab.active{background:#f1eaff;color:#6335a5}.tab.active small{color:#8b5cf6}.source-body,.controls-card{padding:28px}.field-title{display:flex;gap:11px;align-items:flex-start;margin-bottom:24px}.field-title h3,.result-card h3{font-family:Georgia,serif;letter-spacing:-.025em;font-size:22px;margin:0 0 3px}.step{display:grid;place-items:center;width:27px;height:27px;flex:0 0 auto;border-radius:50%;color:#fff;background:#7c3aed;font-size:11px;font-weight:800}.field{margin-top:19px}.field label,.tone-row>label{display:block;margin-bottom:8px;font-size:12px;font-weight:800;letter-spacing:.02em}.field input,.field textarea{box-sizing:border-box;width:100%;padding:13px 14px;border:1px solid #ded6e5;border-radius:11px;color:#21172b;background:#fff;font:500 14px/1.55 inherit;outline:none;resize:vertical}.field input:focus,.field textarea:focus{border-color:#8b5cf6;box-shadow:0 0 0 3px #ede9fe}.field-note{display:block;margin-top:7px;color:#958b9d;font-size:11px}.document-drop{display:flex;min-height:174px;box-sizing:border-box;padding:26px;align-items:center;justify-content:center;flex-direction:column;gap:8px;border:1.5px dashed #bca7d9;border-radius:14px;color:#583988;background:linear-gradient(135deg,#faf7ff,#f7f2ff);text-align:center;cursor:pointer}.document-drop strong{font-size:15px}.document-drop span{color:#7c7184;font-size:12px}.or-divider{display:flex;align-items:center;gap:10px;margin:22px 0 0;color:#a397ad;font-size:10px;font-weight:800;letter-spacing:.1em}.or-divider:before,.or-divider:after{content:'';height:1px;flex:1;background:#eee8f2}.instruction{padding-top:24px;border-top:1px solid #eee8f2}.raw-request textarea{background:linear-gradient(135deg,#fff,#fbf9ff);min-height:230px}.label-row{display:flex;justify-content:space-between;gap:10px}.label-row span{color:#9a8fa2;font-size:11px}.format-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.format{display:flex;gap:8px;align-items:center;padding:10px;border:1px solid #e6dfea;border-radius:10px;background:#fff;color:#5e5566;font:700 12px inherit;text-align:left;cursor:pointer}.format span{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#f1ecf5;color:#9f91aa;font-size:13px}.format.selected{color:#6236a1;border-color:#a78bfa;background:#f6f2ff}.format.selected span{background:#7c3aed;color:#fff}.tone-row{margin-top:25px}.tone-row>div{display:flex;flex-wrap:wrap;gap:6px}.tone{border:1px solid #e6dfea;border-radius:999px;padding:7px 10px;background:#fff;color:#685e71;font:700 11px inherit;cursor:pointer}.tone.active{background:#21172b;border-color:#21172b;color:#fff}.generate{display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:28px;padding:14px 16px;border:0;border-radius:12px;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:#fff;box-shadow:0 10px 20px rgba(109,40,217,.22);font:800 14px inherit;cursor:pointer}.generate span{font-size:20px}.generate:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}.privacy-note{text-align:center;margin-top:13px;font-size:11px}.error-card{display:flex;flex-direction:column;gap:5px;margin-top:20px;padding:18px 20px;border-color:#fecaca;background:#fffafa;color:#991b1b;font-size:13px}.error-card span{color:#b45309}.result-card{margin-top:22px;overflow:hidden}.result-card header{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;padding:26px 28px;border-bottom:1px solid #eee8f2}.result-card h3{margin-top:6px}.copy{padding:9px 13px;border:1px solid #dcd1e8;border-radius:9px;background:#fff;color:#61359a;font:800 12px inherit;cursor:pointer}.result-sections{display:grid;gap:12px;padding:18px}.result-sections article{overflow:auto;padding:19px;border:1px solid #eee7f3;border-radius:13px;background:linear-gradient(120deg,#fff,#fcfbff)}.result-sections pre{margin:0;white-space:pre-wrap;color:#332a3b;font:500 14px/1.75 'Plus Jakarta Sans',sans-serif}.skeleton{padding:26px}.skeleton i{display:block;height:14px;margin:13px 0;border-radius:99px;background:linear-gradient(90deg,#f0ebf4,#e5daf0,#f0ebf4);background-size:200% 100%;animation:shine 1.2s infinite}.skeleton i:nth-child(2){width:82%}.skeleton i:nth-child(3){width:55%}@keyframes shine{to{background-position:-200% 0}}@media(max-width:900px){.studio-grid{grid-template-columns:1fr}.controls-card{position:static}.upload-hero h2{font-size:34px}}@media(max-width:560px){.source-body,.controls-card{padding:20px}.tabs{overflow:auto}.tab{min-width:120px}.format-grid{grid-template-columns:1fr}.result-card header{padding:20px;flex-direction:column}.upload-hero h2{font-size:30px}}
`;