import './index.css';
import {
	DropdownComponent,
	ComboboxComponent,
	MultiselectComponent,
	DataSource,
} from './lib';
import type { DropdownItem } from './lib';

// ============================================================================
// Тестовые данные
// ============================================================================

const fruits: DropdownItem[] = [
	{ value: 1, text: 'Яблоко' },
	{ value: 2, text: 'Апельсин' },
	{ value: 3, text: 'Банан' },
	{ value: 4, text: 'Виноград' },
	{ value: 5, text: 'Манго' },
	{ value: 6, text: 'Ананас' },
	{ value: 7, text: 'Клубника' },
	{ value: 8, text: 'Черника' },
	{ value: 9, text: 'Арбуз', disabled: true },
	{ value: 10, text: 'Персик' },
];

const cities: DropdownItem[] = [
	{ value: 'msk', text: 'Москва' },
	{ value: 'spb', text: 'Санкт-Петербург' },
	{ value: 'nsk', text: 'Новосибирск' },
	{ value: 'ekb', text: 'Екатеринбург' },
	{ value: 'kzn', text: 'Казань' },
	{ value: 'nng', text: 'Нижний Новгород' },
	{ value: 'sam', text: 'Самара' },
	{ value: 'omsk', text: 'Омск' },
	{ value: 'chlb', text: 'Челябинск' },
	{ value: 'rnd', text: 'Ростов-на-Дону' },
];

const colors: DropdownItem[] = [
	{ value: 'red', text: 'Красный' },
	{ value: 'blue', text: 'Синий' },
	{ value: 'green', text: 'Зелёный' },
	{ value: 'yellow', text: 'Жёлтый' },
	{ value: 'purple', text: 'Фиолетовый' },
	{ value: 'orange', text: 'Оранжевый' },
	{ value: 'pink', text: 'Розовый' },
	{ value: 'cyan', text: 'Голубой' },
	{ value: 'black', text: 'Чёрный', disabled: true },
	{ value: 'white', text: 'Белый' },
];

// ============================================================================
// Вспомогательная функция: имитация API-запроса
// ============================================================================

function fakeApi<T>(data: T, delayMs = 1500): Promise<T> {
	return new Promise((resolve) => setTimeout(() => resolve(data), delayMs));
}

// ============================================================================
// Наборы данных для асинхронного демо
// ============================================================================

/** Страны — будут загружаться через fetcher-функцию */
const countries: DropdownItem[] = [
	{ value: 'ru', text: 'Россия' },
	{ value: 'us', text: 'США' },
	{ value: 'de', text: 'Германия' },
	{ value: 'fr', text: 'Франция' },
	{ value: 'cn', text: 'Китай' },
	{ value: 'jp', text: 'Япония' },
	{ value: 'br', text: 'Бразилия' },
	{ value: 'in', text: 'Индия' },
];

/** Языки программирования — наборов данных для reload */
const langsBatch1: DropdownItem[] = [
	{ value: 'ts', text: 'TypeScript' },
	{ value: 'js', text: 'JavaScript' },
	{ value: 'py', text: 'Python' },
	{ value: 'go', text: 'Go' },
	{ value: 'rs', text: 'Rust' },
];

const langsBatch2: DropdownItem[] = [
	{ value: 'cpp', text: 'C++' },
	{ value: 'java', text: 'Java' },
	{ value: 'kt', text: 'Kotlin' },
	{ value: 'sw', text: 'Swift' },
	{ value: 'rb', text: 'Ruby', disabled: true },
];

// ============================================================================
// Инициализация
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
	// ------------------------------------------------------------------
	// Синхронные компоненты
	// ------------------------------------------------------------------
	const dropdownOutput = document.querySelector('#dropdown-output')!;
	const comboboxOutput = document.querySelector('#combobox-output')!;
	const multiselectOutput = document.querySelector('#multiselect-output')!;

	const dropdown = new DropdownComponent({
		selector: '#dropdown',
		items: fruits,
		placeholder: 'Выберите фрукт...',
	});

	dropdown.on('change', (item) => {
		dropdownOutput.textContent = item
			? `Выбрано: ${item.text} (value: ${item.value})`
			: 'Ничего не выбрано';
	});

	const combobox = new ComboboxComponent({
		selector: '#combobox',
		items: cities,
		placeholder: 'Начните вводить город...',
		filter: 'contains',
	});

	combobox.on('change', (item) => {
		comboboxOutput.textContent = item
			? `Выбрано: ${item.text} (value: ${item.value})`
			: 'Ничего не выбрано';
	});

	combobox.on('filtering', (text) => {
		console.log('[Combobox] filtering:', text);
	});

	const multiselect = new MultiselectComponent({
		selector: '#multiselect',
		items: colors,
		placeholder: 'Выберите цвета...',
		showSelectAll: true,
		tagMode: 'multiple',
	});

	multiselect.on('change', (items) => {
		multiselectOutput.textContent = items.length > 0
			? `Выбрано (${items.length}): ${items.map((i) => i.text).join(', ')}`
			: 'Ничего не выбрано';
	});

	// ------------------------------------------------------------------
	// Асинхронный Dropdown — функция-фетчер (lazy, 1.5с задержка)
	// ------------------------------------------------------------------
	const asyncDropdownOutput = document.querySelector('#async-dropdown-output')!;
	asyncDropdownOutput.textContent = 'Откройте список для загрузки...';

	/** DataSource через fetcher-функцию: запрос выполняется только при вызове fetch() */
	const countryDs = new DataSource<DropdownItem>(
		() => fakeApi(countries, 1500),
	);

	countryDs.on('loading', () => {
		asyncDropdownOutput.textContent = '⏳ Загружаем страны...';
	});
	countryDs.on('load', (items) => {
		asyncDropdownOutput.textContent = `✅ Загружено ${items.length} стран`;
	});
	countryDs.on('error', (err) => {
		asyncDropdownOutput.textContent = `❌ Ошибка: ${String(err)}`;
	});

	const asyncDropdown = new DropdownComponent({
		selector: '#async-dropdown',
		dataSource: countryDs,
		placeholder: 'Открой меня...',
	});

	asyncDropdown.on('change', (item) => {
		asyncDropdownOutput.textContent = item
			? `✅ Выбрано: ${item.text} (value: ${item.value})`
			: 'Ничего не выбрано';
	});

	// ------------------------------------------------------------------
	// Асинхронный Combobox — готовый Promise
	// ------------------------------------------------------------------
	const asyncComboboxOutput = document.querySelector('#async-combobox-output')!;
	asyncComboboxOutput.textContent = '⏳ Загружаем города...';

	/** DataSource через готовый Promise: запрос уже запущен при создании */
	const citiesPromiseDs = new DataSource<DropdownItem>(
		fakeApi(cities, 800),
	);

	citiesPromiseDs.on('load', (items) => {
		asyncComboboxOutput.textContent = `✅ Загружено ${items.length} городов — можно вводить`;
	});
	citiesPromiseDs.on('error', (err) => {
		asyncComboboxOutput.textContent = `❌ Ошибка: ${String(err)}`;
	});

	const asyncCombobox = new ComboboxComponent({
		selector: '#async-combobox',
		dataSource: citiesPromiseDs,
		placeholder: 'Введите город...',
		filter: 'contains',
	});

	asyncCombobox.on('change', (item) => {
		asyncComboboxOutput.textContent = item
			? `✅ Выбрано: ${item.text} (value: ${item.value})`
			: 'Ничего не выбрано';
	});

	// ------------------------------------------------------------------
	// Асинхронный Multiselect — invalidate + reload
	// ------------------------------------------------------------------
	const asyncMultiselectOutput = document.querySelector('#async-multiselect-output')!;
	asyncMultiselectOutput.textContent = '⏳ Загружаем языки...';

	let loadCount = 0;

	/** DataSource с функцией, которая возвращает разные данные при каждом вызове */
	const langDs = new DataSource<DropdownItem>(() => {
		loadCount++;
		const batch = loadCount % 2 === 1 ? langsBatch1 : langsBatch2;
		return fakeApi(batch, 1200);
	});

	langDs.on('loading', () => {
		asyncMultiselectOutput.textContent = '⏳ Загружаем...';
	});
	langDs.on('load', (items) => {
		asyncMultiselectOutput.textContent = `✅ Загружено ${items.length} языков (партия ${loadCount})`;
	});
	langDs.on('error', (err) => {
		asyncMultiselectOutput.textContent = `❌ Ошибка: ${String(err)}`;
	});

	const asyncMultiselect = new MultiselectComponent({
		selector: '#async-multiselect',
		dataSource: langDs,
		placeholder: 'Выберите языки...',
		showSelectAll: true,
		tagMode: 'multiple',
	});

	asyncMultiselect.on('change', (items) => {
		if (items.length > 0) {
			asyncMultiselectOutput.textContent =
				`✅ Выбрано (${items.length}): ${items.map((i) => i.text).join(', ')}`;
		}
	});

	// Кнопка «Обновить данные» — invalidate + force fetch
	document.querySelector('#async-multiselect-reload')?.addEventListener('click', () => {
		langDs.invalidate();
		void langDs.fetch(true);
	});

	// ------------------------------------------------------------------
	// Для отладки в консоли
	// ------------------------------------------------------------------
	Object.assign(window, {
		dropdown,
		combobox,
		multiselect,
		asyncDropdown,
		asyncCombobox,
		asyncMultiselect,
		countryDs,
		citiesPromiseDs,
		langDs,
	});
});
