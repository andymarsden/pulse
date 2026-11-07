<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let selectedLeague = $state('all');
	let liveOnly = $state(false);
	let search = $state('');
	let refreshing = $state(false);

	let matches = $derived(
		data.matches.filter((match) => {
			const leagueMatches = selectedLeague === 'all' || match.leagueId === selectedLeague;
			const statusMatches = !liveOnly || match.state === 'in';
			const term = search.trim().toLowerCase();
			return leagueMatches && statusMatches && (!term || `${match.home} ${match.away} ${match.league}`.toLowerCase().includes(term));
		})
	);
	let liveCount = $derived(data.matches.filter((match) => match.state === 'in').length);
	let groupedMatches = $derived(data.leagues.map((league) => ({
		...league,
		matches: matches.filter((match) => match.leagueId === league.id)
	})).filter((league) => league.matches.length));

	function dateLabel(date: string, options: Intl.DateTimeFormatOptions) {
		return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
	}

	async function refresh() {
		refreshing = true;
		try {
			await invalidateAll();
		} finally {
			refreshing = false;
		}

		onMount(() => {
			const timer = setInterval(() => { void refresh(); }, 60_000);
			return () => clearInterval(timer);
		});
	}
</script>

<svelte:head>
	<title>Pitchside — Football, as it happens</title>
	<meta name="description" content="The latest football scores, all in one place." />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="app-shell">
	<aside class="sidebar">
		<a class="brand" href="/" aria-label="Pitchside home"><span class="brand-mark">✳</span><span>pitchside<span class="brand-dot">.</span></span></a>
		<div class="side-section">
			<p class="side-label">YOUR FEED</p>
			<button class="nav-item active" onclick={() => { selectedLeague = 'all'; liveOnly = false; }}><span class="nav-icon">▦</span> Overview <span class="nav-arrow">↗</span></button>
			<button class:active={liveOnly} class="nav-item" onclick={() => { selectedLeague = 'all'; liveOnly = true; }}><span class="nav-icon">◉</span> Live matches <span class="nav-count">{liveCount}</span></button>
		</div>
		<div class="side-section leagues-nav">
			<p class="side-label">FOLLOW THE ACTION</p>
			<p class="side-heading">Top leagues</p>
			{#each data.leagues as league}
				<button class:league-active={selectedLeague === league.id} class="league-link" onclick={() => { selectedLeague = league.id; liveOnly = false; }}>
					<span class="league-icon {league.color}">{league.short}</span><span>{league.name}</span><span class="chevron">›</span>
				</button>
			{/each}
		</div>
		<div class="sidebar-bottom">
			<div class="ball-art">✳</div>
			<p>For the love<br />of the game<span>.</span></p>
			<small>EVERY MATCH. EVERY MOMENT.</small>
		</div>
	</aside>

	<main class="main">
		<header class="topbar">
			<div class="breadcrumb"><span>YOUR MATCHDAY HUB</span><span class="slash">/</span><strong>Overview</strong></div>
			<div class="top-actions">
				<label class="search"><span>⌕</span><input aria-label="Search teams or leagues" placeholder="Search teams or leagues" bind:value={search} /></label>
				<button class="refresh" onclick={refresh} disabled={refreshing} aria-label="Refresh scores" title="Refresh scores">{refreshing ? '···' : '↻'}</button>
				<div class="avatar">P<span>.</span></div>
			</div>
		</header>

		<div class="content">
			<div class="heading-row">
				<div><div class="eyebrow"><span class="eyebrow-line"></span> THE BEAUTIFUL GAME, IN REAL TIME</div><h1>Your matchday, <em>sorted.</em></h1><p class="subtitle">All the scores. All the stories. One place.</p></div>
				<div class="date-today"><span class="calendar-icon">▦</span><div><small>MATCHDAY</small><strong>{dateLabel(data.date, { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div></div>
			</div>

			<section class="hero" aria-label="Matchday summary">
				<div class="hero-copy"><div class="hero-kicker"><span></span> YOUR FRONT ROW SEAT</div><h2>Football never<br />stands <em>still.</em></h2><p>From the first whistle to the final score,<br />we've got you covered.</p><a href="#scores">Explore today's matches <span>↗</span></a></div>
				<div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="football">✳</div><div class="hero-art-label">THE<br />GAME<br /><b>IS ON.</b></div><div class="hero-number">90:00<br /><span>AND BEYOND</span></div></div>
				<div class="hero-bottom"><span>THE WORLD'S GAME, ALL HERE</span><span>01 / 01</span></div>
			</section>

			<div class="dashboard" id="scores">
				<div class="scores-column">
					<div class="section-title"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE MATCH CENTRE</div><h2>Scores & fixtures <span>✳</span></h2><p>Stay close to the action.</p></div><div class="live-pill"><span></span> {liveCount} LIVE</div></div>
					{#if data.isDemo}
						<div class="notice"><strong>Sample scores</strong> · Live scores are currently unavailable. Showing an example matchday.</div>
					{:else if data.unavailable.length}
						<div class="notice">Some leagues are temporarily unavailable: {data.unavailable.join(', ')}.</div>
					{/if}
					<div class="date-strip" aria-label="Select match date">
						{#each data.dates as day}
							<a href="?date={day}" class:selected={day === data.date} aria-current={day === data.date ? 'date' : undefined}><span>{day === data.today ? 'TODAY' : dateLabel(day, { weekday: 'short' }).toUpperCase()}</span><strong>{dateLabel(day, { day: '2-digit' })}</strong><small>{dateLabel(day, { month: 'short' }).toUpperCase()}</small></a>
						{/each}
					</div>
					<div class="filter-row"><div class="filters"><button class:chosen={!liveOnly && selectedLeague === 'all'} onclick={() => { liveOnly = false; selectedLeague = 'all'; }}>All matches <span>{data.matches.length}</span></button><button class:chosen={liveOnly} onclick={() => liveOnly = true}><i></i> Live now</button></div><span class="timezone">Times shown in your local time</span></div>
					{#each groupedMatches as league}
						<section class="match-group">
							<div class="league-header"><span class="league-icon {league.color}">{league.short}</span><div><h3>{league.name}</h3><p>{league.country}</p></div><span class="league-more">•••</span></div>
							{#each league.matches as match}
								<div class="match-row">
									<div class:playing={match.state === 'in'} class="match-status">{#if match.state === 'in'}<span class="status-dot"></span>{match.status}{:else if match.state === 'pre'}{new Date(match.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}{:else}{match.status || 'FT'}{/if}</div>
									<div class="team home"><span>{match.home}</span><span class="team-badge {match.homeColor}">{match.homeShort}</span></div>
									<div class="score">{#if match.state === 'pre'}<span class="versus">vs</span>{:else}{match.homeScore} <span>:</span> {match.awayScore}{/if}</div>
									<div class="team away"><span class="team-badge {match.awayColor}">{match.awayShort}</span><span>{match.away}</span></div>
									<span class="match-arrow">↗</span>
								</div>
							{/each}
						</section>
					{:else}
						<div class="empty"><span>⌁</span><h3>No matches found</h3><p>Try another date, league or search.</p></div>
					{/each}
					<div class="scores-footer"><span>●</span> {data.isDemo ? 'EXAMPLE DATA' : 'SCORES PROVIDED BY ESPN'} <span class="footer-right">MADE FOR MATCHDAYS ↗</span></div>
				</div>

				<aside class="right-column">
					<div class="side-card overview-card"><div class="card-top"><span>MATCHDAY AT A GLANCE</span><span>↗</span></div><h3>In the <em>mix.</em></h3><p>A little snapshot of the action today.</p><div class="stats"><div><strong>{data.matches.length.toString().padStart(2, '0')}</strong><span>MATCHES</span></div><div><strong>{liveCount.toString().padStart(2, '0')}</strong><span>LIVE NOW</span></div><div><strong>{new Set(data.matches.map((match) => match.leagueId)).size.toString().padStart(2, '0')}</strong><span>LEAGUES</span></div></div></div>
					<div class="side-card leagues-card"><div class="card-top"><span>THE BIG PICTURE</span><span>✳</span></div><h3>Leagues to <em>watch.</em></h3><p>Follow your favourites, all season long.</p>{#each data.leagues as league, i}<button class="watch-league" onclick={() => { selectedLeague = league.id; liveOnly = false; }}><span class="rank">0{i + 1}</span><span class="league-icon {league.color}">{league.short}</span><span><strong>{league.name}</strong><small>{league.country}</small></span><span class="watch-arrow">↗</span></button>{/each}</div>
					<div class="quote-card"><span>“</span><p>Football is more than a game. It's a feeling.</p><small>AND WE'RE HERE FOR ALL OF IT.</small><div>✳</div></div>
				</aside>
			</div>
			<footer><span>© {new Date().getFullYear()} PITCHSIDE</span><span>MADE FOR THE FANS, BY THE FANS <b>✳</b></span></footer>
		</div>
	</main>
</div>
