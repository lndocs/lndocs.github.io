# Runs inside the pinned lnbits/lnbits image in CI (piped to `python -`).
# Prints every user-settable LNbits setting with its declared default, as JSON.
import json

from lnbits.settings import EditableSettings, ReadOnlySettings, Settings

editable = set(EditableSettings.__fields__)
readonly = set(ReadOnlySettings.__fields__)


def owner(name):
    for cls in Settings.__mro__:
        if name in cls.__dict__.get("__annotations__", {}):
            return cls.__name__
    return ""


def plain(value):
    try:
        json.dumps(value)
        return value
    except TypeError:
        return str(value)


rows = []
for name, field in Settings.__fields__.items():
    if name not in editable and name not in readonly:
        continue  # transient, runtime-only state
    default = field.default_factory() if field.default_factory else field.default
    env_names = sorted(n.upper() for n in field.field_info.extra.get("env_names", {name}))
    rows.append(
        {
            "name": name,
            "env": env_names,
            "type": field._type_display(),
            "default": plain(default),
            "editable": name in editable,
            "group": owner(name),
        }
    )
print(json.dumps(rows, indent=1, sort_keys=True))
