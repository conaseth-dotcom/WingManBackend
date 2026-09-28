// api/providers.cjs — minimal stub for development mode

module.exports = {
  listProviders(req, res) {
    res.json({ ok: true, providers: [] });
  }
};
