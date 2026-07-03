<script lang="ts">
  interface Props {
    progress: number; // 0 to 1
  }

  let { progress }: Props = $props();
  const pct = $derived(Math.round(progress * 100));
</script>

<div class="progress-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progression">
  <div class="progress-fill" style:height="{pct}%"></div>
</div>

<style>
  .progress-line {
    position: absolute;
    left: 1rem;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--color-surface-2);
    border-radius: 1px;
  }

  .progress-fill {
    background: var(--color-belief);
    border-radius: 1px;
    transition: height 0.3s ease;
    width: 100%;
  }
</style>
