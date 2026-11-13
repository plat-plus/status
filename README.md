# plat.plus status

The status page of [plat.plus](https://plat.plus): **[status.plat.plus](https://status.plat.plus)**.

[Upptime](https://github.com/upptime/upptime) checks plat.plus about every five minutes from GitHub's machines, so the checks and this page keep running when plat.plus is down. Each outage becomes an issue here. The page itself is plain HTML, rebuilt after every check (`page/`) and served from Hetzner in Germany, so visitors never reach GitHub.

<!--start: status pages-->
<!--end: status pages-->

## How it fits together

- `.upptimerc.yml`: the checked addresses.
- `.github/workflows/uptime.yml`, `response-time.yml`, `summary.yml`: Upptime's checks, copied from its template.
- `.github/workflows/page.yml`: builds `page/` into static files after each check and uploads them to Hetzner Webhosting S (Nuremberg) over FTPS; the secrets it needs are listed at its top. `page/htaccess` holds the web server rules (HTTPS, headers).
- `page/`: the page, without dependencies. `node page/build.mjs --fixture` renders sample data into `_site/`; `node --test "page/*.test.mjs"` runs the tests.

Upptime: MIT (`LICENSE.upptime`). Nunito font: SIL Open Font License.
