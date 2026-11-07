import type { PageServerLoad } from './$types';

const leagues = [
	{ id: 'eng.1', name: 'Premier League', country: 'ENGLAND', short: 'PL', color: 'purple' },
	{ id: 'esp.1', name: 'La Liga', country: 'SPAIN', short: 'LL', color: 'coral' },
	{ id: 'ita.1', name: 'Serie A', country: 'ITALY', short: 'SA', color: 'blue' },
	{ id: 'ger.1', name: 'Bundesliga', country: 'GERMANY', short: 'BL', color: 'red' },
	{ id: 'fra.1', name: 'Ligue 1', country: 'FRANCE', short: 'L1', color: 'lime' }
];

type Match = {
	id: string; leagueId: string; league: string; date: string; state: string; status: string;
	home: string; away: string; homeShort: string; awayShort: string;
	homeScore: string; awayScore: string; homeColor: string; awayColor: string;
};

function shiftDate(date: string, days: number) {
	const result = new Date(`${date}T12:00:00Z`);
	result.setUTCDate(result.getUTCDate() + days);
	return result.toISOString().slice(0, 10);
}

function validDate(value: string | null): value is string {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-04' || value > '9999-12-28') return false;
	const parsed = new Date(`${value}T12:00:00Z`);
	return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

const demoMatches: Match[] = [
	{ id: '1', leagueId: 'eng.1', league: 'Premier League', date: '', state: 'in', status: "68'", home: 'Arsenal', away: 'Chelsea', homeShort: 'ARS', awayShort: 'CHE', homeScore: '2', awayScore: '1', homeColor: 'badge-red', awayColor: 'badge-blue' },
	{ id: '2', leagueId: 'eng.1', league: 'Premier League', date: '', state: 'post', status: 'FT', home: 'Man City', away: 'Liverpool', homeShort: 'MCI', awayShort: 'LIV', homeScore: '1', awayScore: '1', homeColor: 'badge-sky', awayColor: 'badge-red' },
	{ id: '3', leagueId: 'eng.1', league: 'Premier League', date: '', state: 'pre', status: '', home: 'Tottenham', away: 'Newcastle', homeShort: 'TOT', awayShort: 'NEW', homeScore: '', awayScore: '', homeColor: 'badge-white', awayColor: 'badge-dark' },
	{ id: '4', leagueId: 'esp.1', league: 'La Liga', date: '', state: 'in', status: "34'", home: 'Barcelona', away: 'Atlético Madrid', homeShort: 'BAR', awayShort: 'ATM', homeScore: '1', awayScore: '0', homeColor: 'badge-blue', awayColor: 'badge-red' },
	{ id: '5', leagueId: 'esp.1', league: 'La Liga', date: '', state: 'pre', status: '', home: 'Real Madrid', away: 'Real Sociedad', homeShort: 'RMA', awayShort: 'RSO', homeScore: '', awayScore: '', homeColor: 'badge-white', awayColor: 'badge-blue' },
	{ id: '6', leagueId: 'ita.1', league: 'Serie A', date: '', state: 'post', status: 'FT', home: 'Inter Milan', away: 'AC Milan', homeShort: 'INT', awayShort: 'MIL', homeScore: '2', awayScore: '2', homeColor: 'badge-blue', awayColor: 'badge-red' }
];

export const load: PageServerLoad = async ({ fetch, url }) => {
	const today = new Date().toISOString().slice(0, 10);
	const requestedDate = url.searchParams.get('date');
	const date = validDate(requestedDate) ? requestedDate : today;
	const results = await Promise.all(leagues.map(async (league) => {
		try {
			const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league.id}/scoreboard?dates=${date.replaceAll('-', '')}`, { signal: AbortSignal.timeout(5000) });
			if (!response.ok) throw new Error('Score feed unavailable');
			const body = await response.json();
			if (!Array.isArray(body.events)) throw new Error('Invalid score feed');
			const matches: Match[] = body.events.flatMap((event: any) => {
				const competition = event.competitions?.[0];
				const home = competition?.competitors?.find((team: any) => team.homeAway === 'home');
				const away = competition?.competitors?.find((team: any) => team.homeAway === 'away');
				if (!home?.team || !away?.team || !event.date || Number.isNaN(Date.parse(event.date))) return [];
				const status = competition.status ?? event.status;
				return [{
					id: String(event.id), leagueId: league.id, league: league.name, date: event.date,
					state: status?.type?.state ?? 'pre', status: status?.type?.state === 'in' ? (status?.displayClock || status?.type?.shortDetail || 'LIVE') : (status?.type?.shortDetail || ''),
					home: home.team.shortDisplayName || home.team.displayName, away: away.team.shortDisplayName || away.team.displayName,
					homeShort: (home.team.abbreviation || 'H').slice(0, 3), awayShort: (away.team.abbreviation || 'A').slice(0, 3),
					homeScore: String(home.score ?? '0'), awayScore: String(away.score ?? '0'),
					homeColor: 'badge-dark', awayColor: 'badge-blue'
				}];
			});
			return { matches, failed: false };
		} catch {
			return { matches: [] as Match[], failed: true };
		}
	}));
	const isDemo = results.every((result) => result.failed);
	return {
		date, today, dates: Array.from({ length: 7 }, (_, index) => shiftDate(date, index - 3)), leagues, isDemo,
		unavailable: results.flatMap((result, index) => result.failed ? [leagues[index].name] : []),
		matches: isDemo ? demoMatches.map((match) => ({ ...match, date: `${date}T17:30:00Z` })) : results.flatMap((result) => result.matches)
	};
};
