const bcrypt = require('bcryptjs');
const { initDB } = require('./db');

const USERS = [
  {
    username: 'editor_prime',
    email: 'editor@knowledgeshare.com',
    password: 'test@123',
    preferences: { savedStreams: ['Technology', 'Trending', 'Business'], theme: 'light' }
  },
  {
    username: 'science_scribe',
    email: 'scribe@knowledgeshare.com',
    password: 'test@123',
    preferences: { savedStreams: ['Science', 'Medical'], theme: 'dark' }
  },
  {
    username: 'market_analyst',
    email: 'analyst@knowledgeshare.com',
    password: 'test@123',
    preferences: { savedStreams: ['Business', 'Entertainment'], theme: 'light' }
  }
];

const ARTICLES = [
  {
    title: 'The Era of Native Multimodal AI: Architecting Systems with Reasoning at Scale',
    stream: 'Technology',
    cover_image_path: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=600&auto=format&fit=crop',
    author_username: 'editor_prime',
    content: `> "The transition from text-only reasoning to native multimodal systems represents the most significant architectural paradigm shift in artificial intelligence since the transformer itself."

## Architecting Reasoning at Scale

In 2026, enterprise deployment of artificial intelligence has moved past simple chatbot interfaces into autonomous cognitive architectures. Native multimodal models—which process video, audio, code, and sensory data streams concurrently without separate transcription pipelines—are now operating at scale. These systems are defined by their ability to perform deep multi-step reasoning before generating outputs, representing a shift from raw statistical generation to systematic logical inference.

Deploying these reasoning models requires a new architectural blueprint. System architects are now focusing on:

1. **Integrated Sensory Memory Layers**: Storing vector representation of real-time audio and video streams rather than text transcriptions.
2. **Dynamic Computation Budgets**: Allowing the system to consume varying computation steps depending on the complexity of the logical problem.
3. **Guardrail Enclaves**: Running localized reasoning checks directly on-device or within sandboxed secure environments to prevent hallucination propagation.

## Native Video Generation in Production

One of the most disruptive aspects of native multimodality is the creation of real-time native video generation tools. In professional workflows, this enables immediate simulation of interface mocks, virtual testing environments, and customized marketing media generated dynamically. Unlike the stitched frame-by-frame generators of the past, 2026 models generate spatial-temporal representations directly, maintaining physics-based consistency across clips.

As enterprises adapt, the challenge lies in scaling the high-bandwidth GPU clusters required to maintain low-latency reasoning cycles. The organizations that succeed will be those that treat reasoning compute as a primary design constraint.`
  },
  {
    title: 'Quantum Error Correction: The Enterprise Shift Toward Post-Quantum Cryptography Standards',
    stream: 'Technology',
    cover_image_path: 'https://images.unsplash.com/photo-1661956602116-aa6865609028?q=80&w=600&auto=format&fit=crop',
    author_username: 'editor_prime',
    content: `> "Quantum computer development has reached a critical velocity. As labs build fault-tolerant qubits, the mathematical assumptions backing global finance must adapt today."

## The Crytographic Countdown

For years, quantum computing existed primarily in academic labs. However, recent breakthroughs in **Quantum Error Correction (QEC)** have dramatically reduced the physical-to-logical qubit ratio required to execute complex operations. With fault-tolerant logical qubits now functioning in production environments, the timeline for decrypting RSA-based signatures has shrunk.

Consequently, financial corporations and state entities are accelerating their transition toward **Post-Quantum Cryptography (PQC)** standards.

## Moving from Labs to Production

The migration to PQC is not a simple software update. It involves auditing legacy systems, identifying exposed communication channels, and rewriting foundational handshake protocols.

### Key Transition Pillars:

- **Algorithm Upgrades**: Deploying lattice-based cryptography schemes (like Kyber and Dilithium) approved by global standards agencies.
- **Hybrid Cryptography Handshakes**: Using dual-key exchanges that combine classical algorithms with quantum-resistant keys, protecting data transit in case one system fails.
- **Crypto-Agility Architecture**: Writing modular network layers that allow encryption keys to be swapped dynamically without restarting systems.

Ultimately, safeguarding encryption is about proactive risk management. Organizations that delay PQC integration risk exposing their current encrypted back-ups to "harvest now, decrypt later" strategies.`
  },
  {
    title: 'Digital Twins in Healthcare: Virtual Organ Replicas and the Evolution of Surgical Precision',
    stream: 'Medical',
    cover_image_path: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=600&auto=format&fit=crop',
    author_username: 'science_scribe',
    content: `> "The operating room is no longer the first place a surgical blade touches a patient's anatomy. Instead, surgeons practice on living, data-driven virtual twins."

## The Rise of Patient Modeling

Medical practice in 2026 is undergoing a revolution driven by **Digital Twins**—highly precise, dynamic virtual replicas of individual patient organs. By integrating high-resolution MRI scans, real-time arterial blood pressure streams, and genetic biomarkers, computational models simulate real organ behavior under stress.

This allows cardiologists and neurosurgeons to model interventions before entering the sterile operating theater.

## Virtual Organs in Action

Consider a complex cardiac reconstruction. Traditionally, surgeons relied on static 3D prints or spatial imagery. Today, a virtual heart replica:

1. Simulates fluid dynamics of blood flow when different arterial patches are applied.
2. Predicts mechanical stress and potential arrhythmia risks under chemical changes.
3. Adapts dynamically to simulated drug doses, allowing personalized medication scheduling.

## The Technological Underpinnings

Building virtual twins requires highly parallel computing environments capable of solving multi-physics differential equations in real-time. By utilizing local neural networks on clinical devices, medical teams can render real-time organ stress simulations within seconds. This evolution of surgical precision reduces complication rates, increases patient outcomes, and shifts modern healthcare toward a highly personalized, predictive practice.`
  },
  {
    title: 'Multi-Analyte Sensor Innovation: The New Frontier in Preventive Continuous Monitoring Platforms',
    stream: 'Medical',
    cover_image_path: 'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?q=80&w=600&auto=format&fit=crop',
    author_username: 'science_scribe',
    content: `> "Continuous glucose monitors were just the beginning. The next generation of non-invasive sensors tracks multiple biochemical markers in a single, wearable platform."

## Beyond Single Biomarkers

Preventative diagnostics has entered a new dimension with the maturation of **Multi-Analyte Sensor Platforms**. While first-generation wearables monitored physical activities or continuous glucose levels, 2026 sensors utilize microfluidic arrays to sample interstitial fluid continuously.

This enables simultaneous, real-time measurements of lactate, cortisol, sodium, and alcohol levels.

## Preventative Diagnostics Applications

The availability of multiple real-time chemical parameters shifts clinical care from reactive treatment to continuous preventive action:

- **Stress Management**: Tracking cortisol fluctuations relative to sleep quality and metabolic load.
- **Athletic Optimization**: Monitoring lactate thresholds in real-time to adjust training regimens.
- **Cardiovascular Warning Systems**: Detecting micro-fluctuations in electrolytes that signal early dehydration or cardiac stress.

## Engineering Challenges

Designing non-invasive sensors that maintain calibration over weeks is incredibly complex. Sensor surfaces must resist biofouling (the accumulation of proteins on the sensor surface) while remaining highly sensitive. The convergence of biocompatible hydrogels and low-power bluetooth microchips has resolved these issues, establishing continuous bio-telemetry as the standard for personal healthcare.`
  },
  {
    title: 'NASA’s 2026 Lunar Gateway Acceleration: Evaluating the $600M Infrastructure Bets for Mars Logistics',
    stream: 'Science',
    cover_image_path: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop',
    author_username: 'science_scribe',
    content: `> "The road to Mars does not launch from Earth. It stops first at the Lunar Gateway—a critical orbital logistics node in deep space."

## Accelerating the Gateway

In 2026, NASA accelerated funding for the **Lunar Gateway**, injecting an additional $600 million into infrastructure development contracts. The Gateway—a small space station slated to orbit the Moon—is not designed as a temporary habitat, but as a permanent staging ground and logistical checkpoint for deep-space missions, particularly to Mars.

Developing autonomous propulsion systems and closed-loop life support modules is the cornerstone of these investments.

## Orbital Logistics for Mars

Launching directly from Earth to Mars requires massive fuel payloads due to Earth's deep gravity well. The Gateway circumvents this restriction:

1. **Deep Space Fuel Depots**: Storing propellant produced from lunar water ice.
2. **Crew Transit Shuttles**: Housing crews transitioning from Earth shuttle crafts to deep-space transport vessels.
3. **Autonomous Habitation**: Testing automated life-support systems that must operate for years without maintenance supply drops.

## Evaluating Infrastructure Bets

The core technological test is the **Power and Propulsion Element (PPE)**, utilizing high-power solar electric propulsion. This propulsion system will allow the station to adjust its orbit dynamically, maintaining communications and optimization during transport cycles. The success of the Lunar Gateway acceleration represents the primary foundation for human space travel in the decades to come.`
  },
  {
    title: 'Brain-Computer Interface Horizons: Bypassing Peripheral Nervous Systems Safely',
    stream: 'Science',
    cover_image_path: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?q=80&w=600&auto=format&fit=crop',
    author_username: 'science_scribe',
    content: `> "When the brain can communicate directly with external software, physical paralysis transitions from a permanent block to a routing problem."

## The BCI Horizon

Horizons in neurotechnology are expanding rapidly as **Brain-Computer Interfaces (BCIs)** transition from laboratory demonstrations to clinical trials. By implanting micro-electrode arrays directly into the motor cortex or using high-resolution non-invasive EEG caps, BCI systems record neural intent.

These signals are then parsed and translated, bypassing damaged peripheral nervous systems to communicate directly with prosthetic limbs or digital systems.

## Bypassing damaged pathways

Traditional motor signals travel from the motor cortex, down the spinal cord, and through peripheral nerves to contract muscles. When this path is blocked by injury:

- **Direct Signal Capture**: BCI captures firing patterns of neurons associated with movement intent.
- **Software Decoders**: AI models map these firing patterns to specific direction vectors in real-time.
- **Prosthetic Routing**: The software transmits movement coordinates to motorized prosthetics or wheelchairs.

## Safe and Durable Materials

The primary challenge of implantable BCIs is ensuring long-term bio-compatibility. The human brain is a hostile environment for electronics, and scar tissue easily blocks signals. In 2026, researchers have deployed flexible conductive polymers that mimic brain tissue mechanical properties, significantly extending implant lifetimes. As safety records accumulate, the integration of BCI platforms will redefine neurological rehabilitation.`
  },
  {
    title: 'The Fandom Playbook: How Tech Media Platforms Shifted Content Specialization and IP Franchise Value',
    stream: 'Entertainment',
    cover_image_path: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop',
    author_username: 'market_analyst',
    content: `> "IP franchise value is no longer owned by studio boards. It is negotiated daily on interactive community platforms."

## The Death of Broad Entertainment

The entertainment industry is shifting away from broad, mass-market programming toward hyper-specialized content streams. Major tech media platforms have recognized that the highest monetization margins reside within engaged niche fandoms.

By designing platforms around custom community features, media enterprises are re-architecting intellectual property (IP) management.

## Inside Content Specialization

IP value used to be measured by box office numbers or syndication rights. Today, it is measured by community interaction metrics:

1. **Interactive Canon Adaptation**: Allowing communities to vote on story details or characters.
2. **Crowdsourced Media Worlds**: Providing assets to creators to build their own fan games, audiobooks, and fan-fictions.
3. **Dynamic Merchandising**: Using real-time community engagement indices to manufacture limited physical goods.

## The Platform Monopoly

Tech media platforms control this cycle by hosting the community ecosystems. By integrating digital marketplaces, chat rooms, and fan content under one roof, they maintain user engagement, creating barriers to exit. Entertainment franchises that want to remain relevant must throw out the legacy broadcast playbook and build collaborative community platforms.`
  },
  {
    title: 'Generative AI in Production Workflows: Embedded Creative Pipelines vs. Zero-Sum Experiments',
    stream: 'Entertainment',
    cover_image_path: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
    author_username: 'market_analyst',
    content: `> "Generative AI is not replacing creative writers. It is replacing artists who refuse to incorporate AI tools into their toolkits."

## Beyond Zero-Sum Experiments

Initially, generative AI in production was treated as a zero-sum threat to artists and writers. However, in 2026, the entertainment industry has transitioned toward **Embedded Creative Pipelines**. Rather than generating raw, finished assets from scratch, creatives utilize AI systems as collaborative assistants to accelerate pre-production and iteration cycles.

This approach balances computational speed with human creative control.

## Embedded Pipelines vs. Zero-Sum

The transition is clear across production studios:

- **Concept Design**: Generating hundreds of color palettes and scene variations in minutes to align director intent.
- **Dynamic Asset Iteration**: Modifying 3D asset details or lighting styles using neural filters without rebuilding meshes.
- **Audio Soundscapes**: Rendering high-fidelity ambient background noise dynamically adjusted to scene pacing.

## Ethical Boundaries and IP Security

The success of embedded pipelines depends on using clean, legally sourced databases. Major studios build private, proprietary AI models trained exclusively on their own catalog, protecting their IP and avoiding copyright disputes. Incorporating AI into creative workflows is a necessity for modern entertainment production.`
  },
  {
    title: 'The Explosion of Autonomous Coding Agents: Balancing Velocity with AI System Ethics',
    stream: 'Trending',
    cover_image_path: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600&auto=format&fit=crop',
    author_username: 'editor_prime',
    content: `> "When software writes software autonomously, the principal challenge shifts from syntax correctness to systemic safety."

## Software Engineering at Speed

The software engineering industry has seen an explosion of **Autonomous Coding Agents** in 2026. These systems do not simply autocomplete code blocks; they autonomously read issue trackers, outline test suites, make changes, run tests, and open pull requests.

While this has dramatically accelerated development cycles, it raises critical questions about system safety and engineering ethics.

## The Engineering Velocity Equation

Autonomous agents reduce developer cycles but introduce new vectors of systemic risk:

1. **Undetected Security Flaws**: AI agents might introduce subtle design bugs that bypass automated test sweeps.
2. **License Propagation**: Agents incorporating code snippets that violate proprietary licenses.
3. **Cognitive Dependency**: Developers merging pull requests without fully understanding the underlying logic.

## Developing Safe Agent Rules

To address these risks, engineering organizations are building **Agentic Guardrails**. These policies define the boundaries of agent actions: sandboxing execution environments, requiring manual approval for deployment cycles, and maintaining detailed logs of all agent actions. The future of software development belongs to collaborative human-agent systems.`
  },
  {
    title: 'The Global Football Shift: How Digital Community Analytics Flattened Traditional Sports Fandom and Gender Stereotypes',
    stream: 'Trending',
    cover_image_path: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=600&auto=format&fit=crop',
    author_username: 'editor_prime',
    content: `> "The digital sports arena has no boundaries. Community data analytics is changing how clubs engage with fans, breaking traditional gender assumptions."

## Flattening Traditional Fandom

Sports media is experiencing a massive transformation as **Digital Community Analytics** reshapes global football. Historically, football fandom was localized and heavily influenced by traditional media broadcast formats. Today, fan engagement is global, decentralized, and driven by interactive statistics platforms.

This digital migration has flattened sports coverage, opening the door for inclusive fan structures.

## Breaking Gender Stereotypes

Community analytics platforms demonstrate that traditional marketing assumptions are outdated:

- **Inclusive Audience Metrics**: Analytics show that women comprise more than 45% of online football discussions, actively participating in tactical analyses and trading pools.
- **De-gendered Engagement**: Digital platforms focus on tactical breakdowns and performance stats, bypassing gendered presentation.
- **Equality in Coverage**: The expansion of women's professional leagues has been accelerated by digital fanbases that value athleticism and tactical play.

## Tactical Analytics for the Masses

By utilizing real-time player data feeds, fans analyze tactical formations and player fitness directly in their browsers. This democratization of sports analytics has created an analytical fan community that values strategic insight over traditional club rivalries.`
  },
  {
    title: 'Agentic Commerce Infrastructure: The Rise of Automated Transaction Frameworks in B2B Supply Chains',
    stream: 'Business',
    cover_image_path: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=600&auto=format&fit=crop',
    author_username: 'market_analyst',
    content: `> "Supply chains are transitioning from automated message passing to autonomous negotiation agents. B2B transactions are becoming agentic."

## The Ingestion of Autonomy in Commerce

Modern global supply chains are turning to **Agentic Commerce**—automated systems that autonomously negotiate prices, order inventory, and manage logistics. Using smart contracts and secure payment channels, transaction agents operate within predefined budgets, reducing delay in B2B transactions.

This shifts operations from manual procurement to automated network management.

## Automated Supply Chain Transactions

The agentic commerce workflow minimizes human intervention across key stages:

1. **Shortage Detection**: Production monitoring systems detect inventory drop.
2. **Negotiation and RFPs**: Procurement agents query supplier databases, dynamically negotiating pricing and logistics terms.
3. **Smart Payments**: Transactions are executed and recorded on digital ledgers, initiating automated customs clearance.

## Mitigating Risk in Agentic Systems

As transaction systems become automated, security and reliability are paramount. Firms deploy dual-signature authorization thresholds and strict protocol limits to prevent runaway automated bidding. Secure, autonomous commerce architectures will separate resilient organizations from vulnerable competitors.`
  },
  {
    title: 'The $14.5 Billion MedTech Wave: Inside the Aggressive Tech Consolidation Realities',
    stream: 'Business',
    cover_image_path: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=600&auto=format&fit=crop',
    author_username: 'market_analyst',
    content: `> "The consolidation of MedTech is not just about financial returns. It is about acquiring proprietary patient data channels."

## The Consolidator Wave

The medical technology industry has been hit by a wave of tech consolidations, capped by a record $14.5 billion in acquisition deals. Silicon Valley and traditional health conglomerates are aggressively buying up diagnostic, sensor, and BCI startups.

This shift is driven by the race to acquire proprietary clinical data channels, which are essential for training the next generation of diagnostics AI models.

## Inside the MedTech Realities

Integrating clinical data silos is a key driver of consolidation:

- **Sensor Integration**: Combining hardware sensors with predictive analytics software.
- **Clinical Data Pipelines**: Unifying data collection across hospitals and remote clinics.
- **Regulatory Clearance**: Leveraging large corporate compliance divisions to navigate FDA clearance cycles.

## Scaling Integrated Diagnostics

For smaller startups, consolidation provides the capital and clinical trials networks required to scale innovations. However, it raises questions about data privacy and market concentration. The corporations that successfully integrate hardware, software, and compliance networks will lead the future of MedTech.`
  }
];

async function seed() {
  console.log('Starting SQLite database seeding...');
  
  let db;
  try {
    db = await initDB();
  } catch (err) {
    console.error('Failed to open database:', err);
    process.exit(1);
  }

  // 1. Seed Users
  const userMap = new Map(); // username -> id
  try {
    for (const u of USERS) {
      // Check if user exists
      let userRow = await db.get('SELECT id FROM users WHERE username = ?', [u.username]);
      
      if (!userRow) {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(u.password, salt);
        const prefJson = JSON.stringify(u.preferences);

        const res = await db.run(
          'INSERT INTO users (username, email, password_hash, preferences_json) VALUES (?, ?, ?, ?)',
          [u.username, u.email, passwordHash, prefJson]
        );
        userMap.set(u.username, res.lastID);
        console.log(`✓ Seeded User: @${u.username} (ID: ${res.lastID})`);
      } else {
        userMap.set(u.username, userRow.id);
        console.log(`✓ User already exists: @${u.username} (ID: ${userRow.id})`);
      }
    }
  } catch (err) {
    console.error('Error seeding users:', err);
    process.exit(1);
  }

  // 2. Clear existing blogs if wanted, or just insert new ones
  // We won't clear, we will just insert. But to avoid duplicate seeding on reruns:
  // Let's check if the article title exists
  try {
    for (const art of ARTICLES) {
      const existing = await db.get('SELECT id FROM blogs WHERE title = ?', [art.title]);
      if (existing) {
        console.log(`- Article already exists: "${art.title}" (ID: ${existing.id})`);
        continue;
      }

      const authorId = userMap.get(art.author_username);
      if (!authorId) {
        console.warn(`! Author username @${art.author_username} not mapped. Skipping article: "${art.title}"`);
        continue;
      }

      const res = await db.run(
        'INSERT INTO blogs (title, content, cover_image_path, stream, author_id) VALUES (?, ?, ?, ?, ?)',
        [art.title, art.content, art.cover_image_path, art.stream, authorId]
      );
      console.log(`✓ Seeded Article: "${art.title}" in stream [${art.stream}] (ID: ${res.lastID})`);
    }
  } catch (err) {
    console.error('Error seeding articles:', err);
    process.exit(1);
  }

  console.log('--- Database Seeding Complete ---');
  process.exit(0);
}

seed();
