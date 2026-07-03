<script lang="ts">
  interface Props {
    term: string;
    definition: string;
  }

  let { term, definition }: Props = $props();
  let visible = $state(false);
  let anchor: HTMLSpanElement | undefined = $state();
  let tooltipEl: HTMLDivElement | undefined = $state();
  let above = $state(false);

  function show() {
    visible = true;
    // Position check after render
    setTimeout(() => {
      if (!anchor || !tooltipEl) return;
      const rect = anchor.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      above = spaceBelow < 120;
    }, 0);
  }

  function hide() {
    visible = false;
  }
</script>

<span class="tooltip-wrapper">
  <span
    class="tooltip-term"
    bind:this={anchor}
    tabindex="0"
    role="button"
    aria-describedby="tooltip-{term}"
    onmouseenter={show}
    onmouseleave={hide}
    onfocus={show}
    onblur={hide}
  >{term}</span>

  {#if visible}
    <div
      bind:this={tooltipEl}
      id="tooltip-{term}"
      class="tooltip-box"
      class:above
      role="tooltip"
    >
      {definition}
    </div>
  {/if}
</span>

<style>
  .tooltip-wrapper {
    position: relative;
    display: inline;
  }

  .tooltip-term {
    color: var(--color-belief);
    text-decoration: underline dotted;
    text-underline-offset: 2px;
    cursor: help;
  }

  .tooltip-term:focus-visible {
    outline: 2px solid var(--color-belief);
    outline-offset: 2px;
    border-radius: 2px;
  }

  .tooltip-box {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: calc(100% + 6px);
    z-index: 100;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    color: var(--color-text);
    max-width: 240px;
    white-space: normal;
    line-height: 1.5;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  }

  .tooltip-box.above {
    top: auto;
    bottom: calc(100% + 6px);
  }
</style>
