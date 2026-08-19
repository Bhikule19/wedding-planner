/* Settings: wedding details (drive the app chrome) and data backup / restore / reset. */

export const DEFAULT_SETTINGS = { coupleNames: 'Abhishek & Sanika', weddingDate: '2026-12-18' };

const pad = (n) => String(n).padStart(2, '0');
const todayStamp = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

export function createSettings(ctx) {
  const form = document.querySelector('#settings-form');
  const exportBtn = document.querySelector('#export-data');
  const importInput = document.querySelector('#import-data');
  const resetBtn = document.querySelector('#reset-demo');

  function render() {
    const s = ctx.getState().settings || {};
    form.elements.coupleNames.value = s.coupleNames || '';
    form.elements.weddingDate.value = s.weddingDate || '';
  }

  form.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'cancel') return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    ctx.setState({ ...ctx.getState(), settings: { coupleNames: (data.coupleNames || '').trim(), weddingDate: data.weddingDate || '' } });
    ctx.toast('Wedding details saved.');
  });

  exportBtn.addEventListener('click', () => {
    try {
      const blob = new Blob([JSON.stringify(ctx.getState(), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wedding-plan-${todayStamp()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      ctx.toast('Backup downloaded.');
    } catch (error) {
      ctx.toast('Could not export the backup.');
    }
  });

  importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object') throw new Error('bad');
        if (!confirm('Replace everything currently in the app with this backup?')) return;
        ctx.importData(data);
        ctx.toast('Backup restored.');
      } catch (error) {
        ctx.toast('That file could not be read as a backup.');
      } finally {
        importInput.value = '';
      }
    };
    reader.onerror = () => ctx.toast('Could not read that file.');
    reader.readAsText(file);
  });

  resetBtn.addEventListener('click', () => {
    if (!confirm('Reset everything to the original demo data? This clears your entries.')) return;
    ctx.resetData();
    ctx.toast('Reset to demo data.');
  });

  return { render };
}
