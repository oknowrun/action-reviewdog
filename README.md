# reviewdog caching action

This action loads `reviewdog` into the GitHub Action tools-cache.

## Inputs

### `version`

**Required** The version of reviewdog to load. Default `"latest"`.

## Example usage

```yaml
uses: oknowrun/action-reviewdog@v1
with:
  version: 0.10.0
```
