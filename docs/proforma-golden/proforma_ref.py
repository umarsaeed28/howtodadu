"""
Independent reference implementation of the Pencil proforma spec (docs/PROFORMA_PLAN.md), written from the
spec rather than from the TypeScript, to produce golden expectations. Money in integer cents. Uses math.erf
(exact) for the S-curve and its own bisection IRR, so agreement with the TS engine is evidence, not tautology.
"""
import json, math, sys, datetime
from decimal import Decimal, ROUND_HALF_UP

def rc(x):  # round half away from zero to integer cents
    return int(Decimal(str(x)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))

def pct_of(amount, pct):
    return rc(amount * pct / 100)

def split_weights(total, weights):
    w = sum(weights)
    n = len(weights)
    if n == 0: return []
    if w <= 0:
        each = rc(total / n); parts = [each] * n; parts[-1] = total - each * (n - 1); return parts
    parts, running, cum = [], 0, 0
    for i, wi in enumerate(weights):
        cum += wi
        c = total if i == n - 1 else rc(total * cum / w)
        parts.append(c - running); running = c
    return parts

def split_even(total, n):
    return split_weights(total, [1] * n)

def norm_cdf(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))

def scurve(months):
    mean, sd = months / 2, max(months / 4, 1e-9)
    F = lambda m: norm_cdf((m - mean) / sd)
    lo, hi = F(0), F(months)
    return [(F(i + 1) - F(i)) / (hi - lo) for i in range(months)]

def draws(budget, months, curve):
    return split_weights(budget, scurve(months) if curve == "scurve" else [1] * months)

TIERS_2023 = [(52500000, 1.1), (152500000, 1.28), (302500000, 2.75), (None, 3.0)]
TIERS_2027 = [(55100000, 1.1), (155100000, 1.28), (305100000, 2.75), (None, 3.0)]

def reet(price, iso, local_pct):
    tiers = TIERS_2027 if iso >= "2027-01-01" else TIERS_2023
    tax, lower = 0, 0
    for up, rate in tiers:
        upper = math.inf if up is None else up
        if price <= lower: break
        tax += pct_of(min(price, upper) - lower, rate); lower = upper
    return tax + pct_of(price, local_pct)

def add_months(iso, n):
    y, m, d = map(int, iso.split("-"))
    mm = m - 1 + n; yy = y + mm // 12; mm = mm % 12 + 1
    last = (datetime.date(yy + (mm == 12), (mm % 12) + 1, 1) - datetime.timedelta(days=1)).day
    return datetime.date(yy, mm, min(d, last)).isoformat()

def days_between(a, b):
    return (datetime.date.fromisoformat(b) - datetime.date.fromisoformat(a)).days

def xirr(flows):  # [(amount, day)]
    if not any(a > 0 for a, _ in flows) or not any(a < 0 for a, _ in flows): return None
    f = lambda r: sum(a / (1 + r) ** (d / 365) for a, d in flows)
    lo, hi = -0.99, 10.0
    flo = f(lo)
    if (flo > 0) == (f(hi) > 0): return None
    for _ in range(300):
        mid = (lo + hi) / 2; fm = f(mid)
        if abs(fm) < 1e-9 or hi - lo < 1e-14: return mid
        if (fm > 0) == (flo > 0): lo, flo = mid, fm
        else: hi = mid
    return (lo + hi) / 2

def pmt(r, n, pv):
    if n <= 0 or pv == 0: return 0
    if r == 0: return rc(pv / n)
    q = (1 + r) ** n
    return rc(pv * r * q / (q - 1))

def amort(principal, annual, years):
    n = round(years * 12); r = annual / 12; p = pmt(r, n, principal); rows = []; bal = principal
    for k in range(1, n + 1):
        if bal <= 0: break
        i = rc(bal * r); pr = min(bal, p - i)
        if k == n: pr = bal
        bal -= pr; rows.append((i + pr, i, pr, bal))
    return rows

def D(**kw):  # defaults mirroring schema.ts
    i = {
        "meta": {"strategy": "rent_hold", "closingDate": "2026-10-01"},
        "acq": {"ownership": "buy", "price": 0, "currentValue": 0, "closingPct": 0, "buyerPaysReet": False, "reetLocalPct": 0.5, "dd": 0},
        "budget": {"sqft": 0, "hardPerSf": 35000, "siteWork": 0, "util": 0, "design": 0, "eng": 0, "survey": 0, "permits": 0, "legal": 0, "subdivision": 0, "builderFeePct": 0, "devFeePct": 0, "hardContPct": 5, "softContPct": 0},
        "tl": {"design": 1, "permit": 4, "build": 8, "lease": 2, "curve": "scurve"},
        "fin": {"mode": "construction_loan", "ltc": 0, "rate": 10, "points": 1, "reserve": True, "ltv": 70, "prate": 6.75, "amort": 30, "dscr": 1.25, "equity": None},
        "ops": {"units": [], "vac": 5, "tax": 0, "ins": 0, "utilA": 0, "repairsPct": 0, "capex": 0, "mgmt": 8, "hoa": 0},
        "gx": {"rentG": 0, "expG": 0, "hold": 10, "cap": 0, "sellPct": 6, "scope": "unit", "unitPrice": 0, "wholePrice": 0, "houseValue": 0},
    }
    for k, v in kw.items(): i[k].update(v)
    return i

def ops_month(i, op, lease, no_growth=False):
    o, g = i["ops"], i["gx"]
    year = (op - 1) // 12
    rf = 1.0 if no_growth else (1 + g["rentG"] / 100) ** year
    ef = 1.0 if no_growth else (1 + g["expG"] / 100) ** year
    ramp = op / lease if (lease > 0 and op <= lease) else 1
    gpr_full = rc(sum(o["units"]) * rf); gpr = rc(gpr_full * ramp)
    vac = pct_of(gpr, o["vac"]); egi = gpr - vac
    fx = lambda a: rc(a * ef / 12)
    opex = fx(o["tax"]) + fx(o["ins"]) + fx(o["utilA"]) + pct_of(egi, o["repairsPct"]) + fx(o["capex"]) + pct_of(egi, o["mgmt"]) + fx(o["hoa"])
    return gpr, vac, egi, opex, egi - opex

def stabilized_noi(i):
    return sum(ops_month(i, m, 0, True)[4] for m in range(1, 13))

def forward_noi(i, from_op, lease):
    return sum(ops_month(i, m, lease)[4] for m in range(from_op + 1, from_op + 13))

def construction_loan(spend, ltc_pct, rate_pct, pts_pct, reserve_on, owner_prop):
    def sched(commit, principal):
        r = rate_pct / 100 / 12; points = pct_of(commit, pts_pct)
        cash_cost = sum(spend) + points - owner_prop
        eq_left = max(0, cash_cost - principal); bal = 0; rows = []; tot_i = 0; res = 0
        for m, sp in enumerate(spend):
            need = sp + (points if m == 0 else 0) - (owner_prop if m == 0 else 0)
            interest = rc(bal * r)
            cap = interest if (interest > 0 and reserve_on) else 0
            paid = interest if (interest > 0 and not reserve_on) else 0
            eq_in = paid
            from_eq = min(max(0, need), eq_left); eq_left -= from_eq; eq_in += from_eq; need -= from_eq
            draw = max(0, need) + cap; bal += draw; tot_i += interest; res += cap
            rows.append({"draw": draw, "interest": interest, "cap": cap, "paid": paid, "balance": bal, "equityIn": eq_in})
        return {"amount": commit, "points": points, "interest": tot_i, "reserve": res, "rows": rows, "payoff": bal, "equity": sum(x["equityIn"] for x in rows)}
    if ltc_pct <= 0: return sched(0, 0)
    ltc, pts = ltc_pct / 100, pts_pct / 100; S = sum(spend)
    commit = rc(ltc * S / (1 - ltc * pts)); principal = commit; s = sched(commit, principal)
    for _ in range(60):
        nxt = rc(ltc * (S + s["interest"]) / (1 - ltc * pts))
        nxt_p = nxt - (s["reserve"] if reserve_on else 0)
        stable = abs(nxt - commit) <= 1
        commit = nxt; principal = max(0, nxt_p); s = sched(commit, principal)
        if stable: break
    return s

def perm_loan(noi, value, ltv, rate, years, dscr, max_amount):
    by_ltv = pct_of(value, ltv); r = rate / 100 / 12; n = years * 12
    ds = (noi / dscr) / 12 if dscr > 0 else 0
    by_dscr = rc(ds * n) if r == 0 else rc(ds * (1 - (1 + r) ** -n) / r)
    amt = max(0, min(by_ltv, by_dscr))
    if max_amount is not None and amt > max_amount: amt = max_amount
    return {"amount": amt, "byLtv": by_ltv, "byDscr": by_dscr, "payment": pmt(r, n, amt), "sched": amort(amt, rate / 100, years)}

def run(i):
    a, b, t, f, g = i["acq"], i["budget"], i["tl"], i["fin"], i["gx"]
    strat = i["meta"]["strategy"]; close = i["meta"]["closingDate"]
    design_start = 1; permit_start = 1 + t["design"]; build_start = permit_start + t["permit"]
    co = build_start + t["build"] - 1; ops_start = co + 1; stab = ops_start + t["lease"]
    exit_m = co + t["lease"] if strat == "sell" else stab + g["hold"] * 12 - 1
    n = exit_m + 1
    buy = a["ownership"] == "buy"
    land = a["price"] if buy else a["currentValue"]
    closing = pct_of(a["price"], a["closingPct"]) if buy else 0
    reet_buy = reet(a["price"], close, a["reetLocalPct"]) if (buy and a["buyerPaysReet"]) else 0
    construction = rc(b["sqft"] * b["hardPerSf"]); hard_base = construction + b["siteWork"] + b["util"]
    soft_items = {"design": b["design"], "eng": b["eng"], "survey": b["survey"], "permits": b["permits"], "legal": b["legal"], "subdivision": b["subdivision"]}
    soft_base = sum(soft_items.values())
    builder = pct_of(hard_base, b["builderFeePct"]); dev = pct_of(hard_base + soft_base, b["devFeePct"])
    hard_cont = pct_of(hard_base, b["hardContPct"]); soft_cont = pct_of(soft_base, b["softContPct"])
    dev_cost = land + closing + reet_buy + a["dd"] + hard_base + soft_base + builder + dev + hard_cont + soft_cont
    # spend by month
    spend = [0] * n
    def put(amount, frm, to, weights=None):
        if amount == 0: return
        span = max(1, to - frm + 1)
        parts = split_weights(amount, weights) if weights else split_even(amount, span)
        for k, p in enumerate(parts): spend[min(n - 1, frm + k)] += p
    for amt in (land, closing, reet_buy, a["dd"]): put(amt, 0, 0)
    dm = (design_start, permit_start - 1) if t["design"] > 0 else (0, 0)
    dpm = (design_start, build_start - 1) if t["design"] + t["permit"] > 0 else (0, 0)
    soft_by_month = [0] * n
    def put_soft(amount, frm, to):
        if amount == 0: return
        parts = split_even(amount, max(1, to - frm + 1))
        for k, p in enumerate(parts): spend[min(n - 1, frm + k)] += p; soft_by_month[min(n - 1, frm + k)] += p
    put_soft(b["design"], *dm)
    for k in ("eng", "survey", "legal"): put_soft(b[k], *dpm)
    pm = permit_start if t["permit"] > 0 else 0
    put_soft(b["permits"], pm, pm)
    hd = draws(hard_base, t["build"], t["curve"]); put(hard_base, build_start, co, hd)
    for amt in (builder, dev, hard_cont): put(amt, build_start, co, [max(x, 0) for x in hd])
    sw = soft_by_month[: co + 1]
    put(soft_cont, 0, co, sw if any(w > 0 for w in sw) else None)
    put(b["subdivision"], co, co)
    carry_m = rc((i["ops"]["tax"] + i["ops"]["ins"]) / 12)
    carry_end = exit_m if strat == "sell" else co
    carry = [carry_m if 1 <= m <= carry_end else 0 for m in range(n)]
    owner_prop = a["currentValue"] if not buy else 0
    payoff_m = exit_m if strat == "sell" else stab
    cl = None
    if f["mode"] == "construction_loan" and f["ltc"] > 0:
        cl = construction_loan([spend[m] + carry[m] for m in range(payoff_m + 1)], f["ltc"], f["rate"], f["points"], f["reserve"], owner_prop)
    s_noi = 0 if strat == "sell" else stabilized_noi(i)
    cap = g["cap"] / 100
    stab_value = rc(s_noi / cap) if cap > 0 else 0
    pl = None
    if strat != "sell" and (strat == "refi_hold" or cl):
        payoff = cl["payoff"] if cl else 0
        pl = perm_loan(s_noi, stab_value, f["ltv"], f["prate"], f["amort"], f["dscr"], payoff if strat == "rent_hold" else None)
        if pl["amount"] <= 0: pl = None
    if strat == "sell": exit_value = g["unitPrice"] if g["scope"] == "unit" else g["wholePrice"]
    else: exit_value = rc(forward_noi(i, exit_m - co, t["lease"]) / cap) if cap > 0 else 0
    exit_date = add_months(close, exit_m)
    exit_reet = reet(exit_value, exit_date, a["reetLocalPct"]) if exit_value > 0 else 0
    rows = []; cum = 0; perm_bal = 0; pidx = 0; tot_noi = 0
    for m in range(n):
        date = add_months(close, m); day = days_between(close, date)
        eq_dev = spend[m] + carry[m]; points = 0
        if cl and m <= payoff_m:
            lm = cl["rows"][m]; points = cl["points"] if m == 0 else 0; eq_dev = lm["equityIn"] + (owner_prop if m == 0 else 0)
        noi = 0
        if strat != "sell" and m >= ops_start:
            noi = ops_month(i, m - co, t["lease"])[4]
        tot_noi += noi
        perm_cash = 0; payoff = 0; cashout = 0
        if pl and m == stab:
            perm_bal = pl["amount"]; po = cl["payoff"] if cl else 0; payoff = po
            cashout = pl["amount"] - po if pl["amount"] >= po else 0
            short = po - pl["amount"] if pl["amount"] < po else 0
            perm_cash = cashout - short
        elif pl and m > stab and pidx < len(pl["sched"]):
            pay, it, pr, bal = pl["sched"][pidx]; pidx += 1; perm_bal = bal; perm_cash = -pay
        sale_net = 0; sale_payoff = 0; retained = 0; dspay = -perm_cash if (pl and m > stab and perm_cash < 0) else 0
        if m == exit_m and exit_value > 0:
            sell_costs = pct_of(exit_value, g["sellPct"])
            sale_net = exit_value - sell_costs - exit_reet
            if strat == "sell" and cl: sale_payoff = cl["payoff"]
            if pl: sale_payoff = perm_bal; perm_bal = 0
            if strat == "sell" and g["scope"] == "unit": retained = g["houseValue"]
        project = -(spend[m] + carry[m]) + noi + sale_net + retained
        equity = -eq_dev - points + noi + perm_cash + sale_net - sale_payoff + retained
        cum += equity
        rows.append({"m": m, "day": day, "project": project, "equity": equity, "cum": cum, "noi": noi, "ds": dspay, "cashout": cashout})
    fin_cost = (cl["points"] + cl["interest"]) if cl else 0
    total_cost = dev_cost + fin_cost + sum(carry)
    eq_in = -sum(min(0, r["equity"]) for r in rows); eq_out = sum(max(0, r["equity"]) for r in rows)
    peak = -min(0, min(r["cum"] for r in rows))
    net_sale = (exit_value - pct_of(exit_value, g["sellPct"]) - exit_reet + (g["houseValue"] if (strat == "sell" and g["scope"] == "unit") else 0)) if exit_value > 0 else 0
    stab_rows = rows[stab: stab + 12]
    stab_noi_12 = sum(r["noi"] for r in stab_rows); stab_ds = sum(r["ds"] for r in stab_rows)
    out = {
        "totalProjectCost": total_cost, "totalUses": total_cost,
        "loanAmount": cl["amount"] if cl else 0, "loanPoints": cl["points"] if cl else 0, "loanInterest": cl["interest"] if cl else 0, "loanPayoff": cl["payoff"] if cl else 0,
        "permAmount": pl["amount"] if pl else 0, "stabilizedNoi": s_noi, "stabilizedValue": stab_value, "exitValue": exit_value, "exitReet": exit_reet,
        "netSaleProceeds": net_sale, "totalEquity": eq_in, "peakEquity": peak, "totalDistributions": eq_out,
        "equityMultiple": (eq_out / eq_in) if eq_in > 0 else None,
        "unleveredIrr": xirr([(r["project"], r["day"]) for r in rows]), "leveredIrr": xirr([(r["equity"], r["day"]) for r in rows]),
        "sumEquityCf": sum(r["equity"] for r in rows), "sumProjectCf": sum(r["project"] for r in rows),
        "profit": net_sale - total_cost + (0 if strat == "sell" else tot_noi),
        "dscrYear1": (stab_noi_12 / stab_ds) if (stab_ds > 0 and strat != "sell") else None,
        "refiCashOut": sum(r["cashout"] for r in rows), "months": n, "stabilization": stab, "exit": exit_m,
    }
    return out, rows

# ---- waterfall (same spec as waterfall.ts) ----
def lp_irr_with(flows, days, at, extra):
    return xirr([(a + (extra if k == at else 0), days[k]) for k, a in enumerate(flows)])

def room(flows, days, at, hurdle, cap):
    cur = lp_irr_with(flows, days, at, 0)
    if cur is not None and cur >= hurdle: return 0
    if cap <= 0: return 0
    at_cap = lp_irr_with(flows, days, at, cap)
    if at_cap is None or at_cap <= hurdle: return cap
    lo, hi = 0, cap
    while hi - lo > 1:
        mid = (lo + hi) // 2; r = lp_irr_with(flows, days, at, mid)
        if r is not None and r > hurdle: hi = mid
        else: lo = mid
    return lo

def waterfall(flows, days, lp_pct, pref, tiers):
    lps = lp_pct / 100; n = len(flows); lp = [0] * n; gp = [0] * n
    T = [(pref / 100, lps)] + [(h / 100, s / 100) for h, s in tiers]
    last = T[-1][1]
    for m in range(n):
        f = flows[m]
        if f < 0:
            l = rc(f * lps); lp[m] += l; gp[m] += f - l; continue
        left = f
        for hurdle, share in T:
            if left <= 0: break
            lr = room(lp, days, m, hurdle, rc(left * share))
            if lr <= 0: continue
            tier_total = min(left, rc(lr / share)) if share > 0 else 0
            to_lp = min(lr, rc(tier_total * share)); to_gp = tier_total - to_lp
            lp[m] += to_lp; gp[m] += to_gp; left -= tier_total
        if left > 0:
            to_lp = rc(left * last); lp[m] += to_lp; gp[m] += left - to_lp
    side = lambda fl: {"contributions": -sum(x for x in fl if x < 0), "distributions": sum(x for x in fl if x > 0), "irr": xirr([(a, days[k]) for k, a in enumerate(fl)])}
    return {"lp": side(lp), "gp": side(gp)}

DEALS = {
  "rent_hold_all_cash": D(meta={"strategy": "rent_hold"}, acq={"price": 77500000, "closingPct": 1.5}, budget={"sqft": 1000, "design": 1500000, "eng": 500000, "survey": 300000, "permits": 1200000, "legal": 200000, "util": 2300000},
      fin={"mode": "all_cash"}, ops={"units": [320000, 400000], "tax": 900000, "ins": 240000, "capex": 120000, "repairsPct": 5}, gx={"cap": 5.5, "rentG": 3, "expG": 2, "hold": 10}),
  "rent_hold_levered": D(meta={"strategy": "rent_hold"}, acq={"price": 77500000, "closingPct": 1.5}, budget={"sqft": 1000, "design": 1500000, "eng": 500000, "survey": 300000, "permits": 1200000, "legal": 200000, "util": 2300000},
      fin={"ltc": 65}, ops={"units": [320000, 400000], "tax": 900000, "ins": 240000, "capex": 120000, "repairsPct": 5}, gx={"cap": 5.5, "rentG": 3, "expG": 2, "hold": 10}),
  "build_to_sell": D(meta={"strategy": "sell", "closingDate": "2026-11-15"}, acq={"price": 82000000, "closingPct": 1.0, "dd": 500000}, budget={"sqft": 900, "hardPerSf": 36000, "siteWork": 2500000, "design": 2000000, "eng": 600000, "survey": 350000, "permits": 1400000, "legal": 800000, "subdivision": 2500000, "builderFeePct": 8, "devFeePct": 3, "hardContPct": 7, "softContPct": 5},
      tl={"design": 2, "permit": 5, "build": 9, "lease": 3, "curve": "straight"}, fin={"ltc": 70, "rate": 11, "points": 1.5, "reserve": False}, ops={"tax": 950000, "ins": 250000}, gx={"scope": "unit", "unitPrice": 72000000, "sellPct": 6, "houseValue": 85000000}),
  "refi_hold": D(meta={"strategy": "refi_hold"}, acq={"ownership": "owned", "currentValue": 90000000}, budget={"sqft": 1000, "design": 1800000, "eng": 500000, "survey": 300000, "permits": 1300000, "legal": 200000, "util": 2000000},
      fin={"ltc": 60, "ltv": 70, "dscr": 1.2}, ops={"units": [340000, 420000], "tax": 1000000, "ins": 260000, "capex": 100000, "repairsPct": 4, "vac": 4}, gx={"cap": 5.0, "rentG": 2, "expG": 2, "hold": 7}),
  "lp_gp_waterfall": D(meta={"strategy": "rent_hold"}, acq={"price": 77500000, "closingPct": 1.5}, budget={"sqft": 1000, "design": 1500000, "eng": 500000, "survey": 300000, "permits": 1200000, "legal": 200000, "util": 2300000},
      fin={"ltc": 65, "equity": {"lpPct": 90, "pref": 8, "tiers": [[12, 80], [18, 70]]}}, ops={"units": [320000, 400000], "tax": 900000, "ins": 240000, "capex": 120000, "repairsPct": 5}, gx={"cap": 5.5, "rentG": 3, "expG": 2, "hold": 10}),
}

if __name__ == "__main__":
    out = {}
    for name, deal in DEALS.items():
        o, rows = run(deal)
        if deal["fin"]["equity"]:
            e = deal["fin"]["equity"]
            o["waterfall"] = waterfall([r["equity"] for r in rows], [r["day"] for r in rows], e["lpPct"], e["pref"], e["tiers"])
        out[name] = o
    json.dump(out, sys.stdout, indent=1)
