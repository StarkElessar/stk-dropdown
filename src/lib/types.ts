// ============================================================================
// Общие типы
// ============================================================================

/** Элемент списка */
export type DropdownItem = {
	value: string | number;
	text: string;
	disabled?: boolean;
};

/** Стратегия фильтрации */
export type FilterStrategy = 'contains' | 'startsWith' | 'none';

/** Режим отображения тегов в multiselect */
export type TagMode = 'single' | 'multiple';

// ============================================================================
// Состояния (State)
// ============================================================================

/** Базовое состояние — общее для всех компонентов */
export type BaseComponentState = {
	opened: boolean;
	disabled: boolean;
};

/** Состояние Dropdown — одиночный выбор */
export type DropdownState = BaseComponentState & {
	dataItems: DropdownItem[];
	selectedItem: DropdownItem | null;
	focusedIndex: number;
};

/** Состояние Combobox — расширяет Dropdown фильтрацией */
export type ComboboxState = DropdownState & {
	filterText: string;
	filteredItems: DropdownItem[];
};

/** Состояние Multiselect — множественный выбор */
export type MultiselectState = BaseComponentState & {
	dataItems: DropdownItem[];
	selectedItems: DropdownItem[];
	filterText: string;
	filteredItems: DropdownItem[];
	allSelected: boolean;
	focusedIndex: number;
};

// ============================================================================
// Props (конфигурация компонентов)
// ============================================================================

/** Базовые пропсы — общие для всех компонентов */
export type BaseComponentProps<TState extends BaseComponentState> = {
	selector: string | HTMLInputElement;
	state: TState;
};

/** Пропсы Dropdown */
export type DropdownComponentProps = {
	selector: string | HTMLInputElement;
	items: DropdownItem[];
	placeholder?: string;
	value?: string | number;
};

/** Пропсы Combobox */
export type ComboboxComponentProps = {
	selector: string | HTMLInputElement;
	items: DropdownItem[];
	placeholder?: string;
	value?: string | number;
	filter?: FilterStrategy;
	minFilterLength?: number;
	debounce?: number;
};

/** Пропсы Multiselect */
export type MultiselectComponentProps = {
	selector: string | HTMLInputElement;
	items: DropdownItem[];
	placeholder?: string;
	values?: (string | number)[];
	showSelectAll?: boolean;
	maxSelectedItems?: number;
	tagMode?: TagMode;
};

// ============================================================================
// События (Events)
// ============================================================================

/** Базовые события — общие для всех компонентов */
export type BaseComponentEvents = {
	open: void;
	close: void;
};

/** События Dropdown */
export type DropdownEvents = BaseComponentEvents & {
	change: DropdownItem | null;
};

/** События Combobox */
export type ComboboxEvents = DropdownEvents & {
	filtering: string;
};

/** События Multiselect */
export type MultiselectEvents = BaseComponentEvents & {
	change: DropdownItem[];
};

// ============================================================================
// Служебные константы
// ============================================================================

/** Значение элемента "Выбрать все" */
export const SELECT_ALL_VALUE = -1 as const;
