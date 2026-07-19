.PHONY: dev logs

dev:
	mprocs

# Tail production container logs over SSH (backend + frontend panes).
logs:
	mprocs --config mprocs.logs.yaml
