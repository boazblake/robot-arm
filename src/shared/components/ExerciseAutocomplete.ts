import m from "mithril";

type Attrs = {
  options: string[];
  value: string;
  placeholder?: string;
  onSelect: (name: string) => void;
  maxResults?: number;
  className?: string;
};

let query = "";
let open = false;

const normalize = (input: string) => input.trim().toLowerCase();

const ExerciseAutocomplete: m.Component<Attrs> = {
  onbeforeupdate: ({ attrs }) => {
    if (!open) query = attrs.value || "";
  },
  view: ({ attrs }) => {
    const current = query || attrs.value || "";
    const needle = normalize(current);
    const filtered = attrs.options
      .filter((name) => !needle || normalize(name).includes(needle))
      .slice(0, attrs.maxResults || 10);

    return m(`div.exercise-autocomplete${attrs.className ? ` ${attrs.className}` : ""}`, [
      m("input.exercise-autocomplete-input", {
        value: current,
        placeholder: attrs.placeholder || "Search exercises",
        onfocus: () => {
          open = true;
        },
        oninput: (e: InputEvent) => {
          const target = e.target as HTMLInputElement;
          query = target.value;
          open = true;
        },
      }),
      open && filtered.length > 0
        ? m(
            "div.exercise-autocomplete-list",
            filtered.map((name) =>
              m(
                "button.exercise-autocomplete-item",
                {
                  type: "button",
                  onclick: () => {
                    query = name;
                    open = false;
                    attrs.onSelect(name);
                  },
                },
                name
              )
            )
          )
        : null,
    ]);
  },
};

export default ExerciseAutocomplete;
