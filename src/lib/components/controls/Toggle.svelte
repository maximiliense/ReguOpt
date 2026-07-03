<script lang="ts">
  interface Props {
    checked: boolean;
    label: string;
    onchange?: (checked: boolean) => void;
  }

  let { checked = $bindable(), label, onchange }: Props = $props();

  function toggle() {
    checked = !checked;
    onchange?.(checked);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  }
</script>

<button
  class="toggle"
  class:checked
  role="switch"
  aria-checked={checked}
  aria-label={label}
  onclick={toggle}
  onkeydown={handleKeydown}
  type="button"
>
  <span class="toggle-track">
    <span class="toggle-thumb"></span>
  </span>
  <span class="toggle-label">{label}</span>
</button>

<style>
  .toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    color: var(--color-text);
    font-size: 0.875rem;
    font-family: inherit;
  }

  .toggle:focus-visible {
    outline: 2px solid var(--color-belief);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }

  .toggle-track {
    width: 2.5rem;
    height: 1.375rem;
    background: var(--color-surface-2);
    border-radius: 999px;
    position: relative;
    transition: background 0.2s;
    border: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .toggle.checked .toggle-track {
    background: var(--color-belief);
    border-color: var(--color-belief);
  }

  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 15px;
    height: 15px;
    background: var(--color-text-muted);
    border-radius: 50%;
    transition: transform 0.2s, background 0.2s;
  }

  .toggle.checked .toggle-thumb {
    transform: translateX(1.125rem);
    background: white;
  }

  .toggle-label {
    color: var(--color-text);
    user-select: none;
  }
</style>
