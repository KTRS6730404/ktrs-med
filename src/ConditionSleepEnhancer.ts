const sleepOptions = [
  { label: '〜5.0', value: '5' },
  { label: '5.5', value: '5.5' },
  { label: '6.0', value: '6' },
  { label: '6.5', value: '6.5' },
  { label: '7.0', value: '7' },
  { label: '7.5', value: '7.5' },
  { label: '8.0', value: '8' },
  { label: '8.5', value: '8.5' },
  { label: '9.0', value: '9' },
  { label: '9.5', value: '9.5' },
  { label: '10.0〜', value: '10' },
];

function setReactInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function enhanceSleepInput() {
  const labels = Array.from(document.querySelectorAll('label'));
  const label = labels.find((el) => el.textContent?.includes('睡眠時間')) as HTMLLabelElement | undefined;
  if (!label || label.dataset.sleepEnhanced === 'true') return;

  const input = label.querySelector('input[type="number"]') as HTMLInputElement | null;
  if (!input) return;

  label.dataset.sleepEnhanced = 'true';
  input.style.display = 'none';

  const wrap = document.createElement('div');
  wrap.className = 'conditionScale sleepDurationScale';

  const currentNumeric = Number(input.value);
  const normalized = Number.isFinite(currentNumeric)
    ? currentNumeric <= 5 ? '5' : currentNumeric >= 10 ? '10' : String(currentNumeric)
    : '';

  sleepOptions.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = option.label;
    button.dataset.sleepValue = option.value;
    if (normalized === option.value) button.classList.add('active');
    button.addEventListener('click', () => {
      wrap.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      setReactInputValue(input, option.value);
    });
    wrap.appendChild(button);
  });

  label.appendChild(wrap);
}

const style = document.createElement('style');
style.textContent = `
.sleepDurationScale{display:grid!important;grid-template-columns:repeat(6,minmax(54px,1fr));gap:6px;margin-top:8px}
.sleepDurationScale button{min-width:0!important;padding:7px 6px!important;font-size:12px}
@media(max-width:620px){.sleepDurationScale{grid-template-columns:repeat(4,1fr)}}
`;
document.head.appendChild(style);

const observer = new MutationObserver(enhanceSleepInput);
observer.observe(document.documentElement, { childList: true, subtree: true });
enhanceSleepInput();
