export async function getLanguages(user) {
    const res = await fetch(`https://api.github.com/users/${user}/repos?per_page=100`);
    const repos = await res.json();


    if (!Array.isArray(repos)) {
        console.error("Can't get repos");
        return {};
    }

    const totals = {};

    for (const repo of repos) {
        const langsRes = await fetch(repo.languages_url);
        const langs = await langsRes.json();

        for (const [lang, bytes] of Object.entries(langs)) {
            totals[lang] = (totals[lang || 0] + bytes);
        }
    }
    console.log(totals);

    return totals;
}