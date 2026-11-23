export interface SampleBrowserPage {
  id: string;
  url: string;
  course: string;
  title: string;
  subtitle: string;
  sections: Array<{
    heading: string;
    paragraphs: string[];
    formula?: string;
  }>;
}

export const SAMPLE_BROWSER_PAGES: SampleBrowserPage[] = [
  {
    id: 'neuro-memory',
    url: 'opencourse.edu/psych204/working-memory-consolidation',
    course: 'PSYCH 204 · Cognitive Neuroscience',
    title: 'Working Memory, Active Recall, and Synaptic Consolidation',
    subtitle: 'Lecture 7 Reading · Baddeley-Hitch Model & Testing Effect',
    sections: [
      {
        heading: '1. Architecture of Working Memory',
        paragraphs: [
          'Working memory is not a single passive buffer; Baddeley and Hitch proposed a multi-component workspace coordinated by the Central Executive. The Phonological Loop rehearses verbal and auditory sequences for roughly 2 seconds unless refreshed through articulatory rehearsal, while the Visuospatial Sketchpad manipulates mental imagery and spatial layouts.',
          'Later revisions added the Episodic Buffer, which binds verbal, visual, and long-term semantic chunks into coherent scenes. Modern capacity estimates (Cowan, 2001) place the focus of attention at approximately 4 ± 1 integrated chunks rather than Miller’s classic 7 ± 2 raw items.',
        ],
      },
      {
        heading: '2. Long-Term Potentiation (LTP) & Consolidation',
        paragraphs: [
          'Encoding transient working-memory traces into durable cortical schemas depends on hippocampal-neocortical dialogue. High-frequency stimulation activates AMPA receptors, depolarizing the postsynaptic membrane enough to expel the Mg²⁺ block from NMDA receptors. Calcium (Ca²⁺) influx then triggers CaMKII cascades that insert additional AMPA receptors and remodel dendritic spines.',
        ],
        formula: 'Depolarization (AMPA) → Mg²⁺ expulsion (NMDA) → Ca²⁺ influx → Late-phase protein synthesis (CREB)',
      },
      {
        heading: '3. Why Active Recall Outperforms Re-Reading',
        paragraphs: [
          'Passive highlighting creates an illusion of competence driven by processing fluency: familiar passages feel understood without testing retrieval routes. By contrast, retrieval practice (testing effect) forces effortful reconstruction, strengthening cue-target pathways and exposing weak schemas immediately.',
          'Combining retrieval practice with spaced intervals leverages desirable difficulty. Attempting recall right before forgetting peaks—roughly when retention dips near 80%—yields substantially stronger long-term retention than massed cramming.',
        ],
      },
    ],
  },
  {
    id: 'chem-acids',
    url: 'chemistry.campus.edu/chem112/acid-base-buffers',
    course: 'CHEM 112 · General & Organic Chemistry',
    title: 'Acid-Base Equilibria, pKa Scales, and Biological Buffers',
    subtitle: 'Chapter 15 Notes · Henderson-Hasselbalch & Titration Curves',
    sections: [
      {
        heading: '1. Brønsted-Lowry Strength and pKa',
        paragraphs: [
          'A Brønsted-Lowry acid donates a proton (H⁺) to form its conjugate base (A⁻). Acid strength is quantified by the acid dissociation constant Ka, and more conveniently by pKa = -log₁₀(Ka). Lower pKa values indicate stronger acids that dissociate more completely in aqueous solution.',
          'Remember the inverse conjugate relationship: the stronger an acid, the weaker and more stable its conjugate base. Resonance delocalization, electronegativity, inductive withdrawal, and larger atomic radius all stabilize the conjugate base and lower pKa.',
        ],
        formula: 'Ka = [H₃O⁺][A⁻] / [HA]     |     pKa = -log₁₀(Ka)',
      },
      {
        heading: '2. Buffer Systems & Henderson-Hasselbalch Equation',
        paragraphs: [
          'A buffer resists sharp pH swings when small amounts of strong acid or strong base are added because it contains comparable concentrations of a weak acid (HA) and its conjugate base (A⁻). Optimal buffering capacity occurs within pH = pKa ± 1.',
          'At the half-equivalence point of a weak acid titration with strong base, exactly half of HA has been converted into A⁻, so [A⁻] = [HA] and pH equals pKa directly. A common exam mistake is confusing the half-equivalence point (pH = pKa) with the equivalence point (where pH > 7 for a weak acid titrated by strong base).',
        ],
        formula: 'pH = pKa + log₁₀([A⁻] / [HA])',
      },
      {
        heading: '3. Carbonic Acid / Bicarbonate Blood Buffer',
        paragraphs: [
          'Human arterial blood maintains a tight pH window of 7.35–7.45 using the H₂CO₃ / HCO₃⁻ buffer (effective pKa ≈ 6.1). Even though physiological pH sits more than 1 unit above 6.1, the system works effectively because it is an open system: the lungs continuously regulate dissolved CO₂ via ventilation while the kidneys adjust bicarbonate excretion.',
        ],
      },
    ],
  },
  {
    id: 'cs-dp',
    url: 'cs.university.edu/algo301/dynamic-programming',
    course: 'CS 301 · Design & Analysis of Algorithms',
    title: 'Dynamic Programming: Optimal Substructure & State Transitions',
    subtitle: 'Week 9 Lecture · Memoization vs. Bottom-Up Tabulation',
    sections: [
      {
        heading: '1. When Does Dynamic Programming Apply?',
        paragraphs: [
          'Dynamic Programming (DP) optimizes recursive problems that satisfy two structural properties: (1) Optimal Substructure, meaning an optimal global solution can be constructed from optimal solutions to smaller subproblems, and (2) Overlapping Subproblems, meaning a naive recursion recomputes the exact same states exponentially many times.',
          'Contrast this with Divide-and-Conquer (such as Merge Sort), where subproblems are completely independent and never overlap, and with Greedy algorithms, which commit to a locally optimal choice without exploring alternative subproblem branches.',
        ],
      },
      {
        heading: '2. Top-Down Memoization vs. Bottom-Up Tabulation',
        paragraphs: [
          'Top-down memoization keeps the natural recursive formulation and caches each computed state in a hash map or table. It computes only reachable states but incurs recursion stack overhead. Bottom-up tabulation orders states topologically in a loop, eliminating call-stack limits and enabling space optimization (rolling arrays) when row i depends only on row i - 1.',
        ],
        formula: '0/1 Knapsack:  dp[i][w] = max(dp[i-1][w],  val[i] + dp[i-1][w - wt[i]])',
      },
      {
        heading: '3. Four-Step Recurrence Checklist',
        paragraphs: [
          'To design a bug-free DP algorithm under exam time pressure: (1) Define the exact semantic meaning of state dp[...], (2) Write the transition recurrence relating a state to strictly smaller subproblems, (3) Specify base cases cleanly (often empty prefix or zero capacity), and (4) Verify both time complexity (number of states × transitions per state) and space complexity.',
        ],
      },
    ],
  },
];
