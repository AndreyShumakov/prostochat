# Prostochat Thesaurus - Term Individuals
# Loaded automatically at startup after bootstrap

# ========================================
# Core Semantic Concepts
# ========================================

Term: Individual: event
: SetModel: Model Term
: definition: Структурированная запись факта в графе знаний
: synonym: событие
: synonym: факт
: importance: 5
: domain: Semantics

Term: Individual: triple
: SetModel: Model Term
: definition: Базовая единица знания в формате Субъект-Предикат-Объект
: synonym: триплет
: synonym: тройка
: importance: 5
: broader: event
: domain: Semantics

Term: Individual: individual
: SetModel: Model Term
: definition: Конкретный экземпляр концепта
: synonym: индивид
: synonym: экземпляр
: synonym: инстанс
: importance: 5
: domain: Semantics

Term: Individual: concept
: SetModel: Model Term
: definition: Абстрактный тип или класс сущностей
: synonym: концепт
: synonym: тип
: synonym: класс
: importance: 5
: domain: Semantics

Term: Individual: model
: SetModel: Model Term
: definition: Структурированное описание атрибутов и ограничений концепта
: synonym: модель
: synonym: схема
: importance: 5
: broader: concept
: domain: Semantics

Term: Individual: attribute
: SetModel: Model Term
: definition: Свойство индивида с примитивным значением
: synonym: атрибут
: synonym: свойство
: importance: 4
: broader: model
: domain: Semantics

Term: Individual: relation
: SetModel: Model Term
: definition: Связь между двумя индивидами
: synonym: связь
: synonym: отношение
: synonym: релация
: importance: 4
: broader: model
: domain: Semantics

# ========================================
# Event Graph Concepts
# ========================================

Term: Individual: event_graph
: SetModel: Model Term
: definition: Направленный ациклический граф событий с причинно-следственными связями
: synonym: граф событий
: synonym: DAG
: importance: 5
: related: event
: domain: Engine

Term: Individual: cause
: SetModel: Model Term
: definition: Событие являющееся причиной другого события
: synonym: причина
: importance: 4
: broader: event_graph
: domain: Engine

Term: Individual: actor
: SetModel: Model Term
: definition: Субъект создавший событие
: synonym: актор
: synonym: пользователь
: synonym: агент
: importance: 4
: domain: Engine

Term: Individual: genesis
: SetModel: Model Term
: definition: Начальный набор базовых событий системы
: synonym: генезис
: synonym: bootstrap
: importance: 5
: broader: event_graph
: domain: Engine

# ========================================
# Dataflow Concepts
# ========================================

Term: Individual: dataflow
: SetModel: Model Term
: definition: Автоматическое распространение изменений через условия и действия
: synonym: поток данных
: importance: 5
: domain: Dataflow

Term: Individual: condition
: SetModel: Model Term
: definition: Логическое выражение определяющее доступность или выполнение
: synonym: условие
: importance: 4
: broader: dataflow
: domain: Dataflow

Term: Individual: set_value
: SetModel: Model Term
: definition: Автоматическое вычисление значения атрибута
: synonym: вычисляемое значение
: importance: 4
: broader: dataflow
: domain: Dataflow

Term: Individual: set_do
: SetModel: Model Term
: definition: Автоматическое действие при выполнении условия
: synonym: триггер
: synonym: автодействие
: importance: 4
: broader: dataflow
: domain: Dataflow

Term: Individual: fixpoint
: SetModel: Model Term
: definition: Состояние системы когда больше нет изменений от dataflow
: synonym: фиксация
: synonym: стабильное состояние
: importance: 4
: broader: dataflow
: domain: Dataflow

# ========================================
# BSL Language Concepts
# ========================================

Term: Individual: bsl
: SetModel: Model Term
: definition: Boldsea Semantic Language - декларативный язык описания семантических моделей
: synonym: BSL
: synonym: PEF
: importance: 5
: domain: Semantics

Term: Individual: restriction
: SetModel: Model Term
: definition: Ограничение на значение атрибута или релации в модели
: synonym: ограничение
: synonym: constraint
: importance: 4
: broader: model
: domain: Semantics

Term: Individual: range
: SetModel: Model Term
: definition: Допустимый тип значения для релации
: synonym: диапазон
: importance: 3
: broader: restriction
: domain: Semantics

Term: Individual: required
: SetModel: Model Term
: definition: Обязательность заполнения атрибута
: synonym: обязательный
: importance: 3
: broader: restriction
: domain: Semantics

Term: Individual: permission
: SetModel: Model Term
: definition: Права доступа актора к атрибуту
: synonym: разрешение
: synonym: права
: importance: 3
: broader: restriction
: domain: Security

# ========================================
# View and UI Concepts
# ========================================

Term: Individual: view
: SetModel: Model Term
: definition: Визуальное представление индивида или набора данных
: synonym: представление
: synonym: вид
: importance: 4
: domain: UI

Term: Individual: widget
: SetModel: Model Term
: definition: Интерактивный компонент интерфейса
: synonym: виджет
: synonym: компонент
: importance: 4
: broader: view
: domain: UI

Term: Individual: form
: SetModel: Model Term
: definition: Интерфейс ввода данных на основе модели
: synonym: форма
: importance: 4
: broader: widget
: domain: UI

# ========================================
# Schema and Fragment Concepts
# ========================================

Term: Individual: schema
: SetModel: Model Term
: definition: Шаблон для извлечения структурированной информации из текста
: synonym: схема извлечения
: importance: 4
: domain: AI

Term: Individual: fragment
: SetModel: Model Term
: definition: Извлеченный фрагмент текста соответствующий схеме
: synonym: фрагмент
: synonym: отрывок
: importance: 4
: broader: schema
: domain: AI

Term: Individual: schema_instruction
: SetModel: Model Term
: definition: Инструкция для LLM по извлечению фрагментов
: synonym: инструкция схемы
: importance: 4
: broader: schema
: domain: AI

# ========================================
# Classification Concepts
# ========================================

Term: Individual: classifier
: SetModel: Model Term
: definition: Система категорий для классификации индивидов по определенному основанию
: synonym: классификатор
: importance: 4
: domain: Semantics

Term: Individual: category
: SetModel: Model Term
: definition: Один из вариантов классификации в рамках классификатора
: synonym: категория
: synonym: класс
: importance: 4
: broader: classifier
: domain: Semantics

# ========================================
# Document Concepts
# ========================================

Term: Individual: document
: SetModel: Model Term
: definition: Текстовый или структурированный документ в системе
: synonym: документ
: importance: 4
: domain: Storage

Term: Individual: author
: SetModel: Model Term
: definition: Автор документа или контента
: synonym: автор
: importance: 3
: related: document
: domain: Storage

# ========================================
# Network and Sync Concepts
# ========================================

Term: Individual: sync
: SetModel: Model Term
: definition: Синхронизация событий между узлами сети
: synonym: синхронизация
: importance: 4
: domain: Network

Term: Individual: consensus
: SetModel: Model Term
: definition: Согласование состояния между узлами распределенной сети
: synonym: консенсус
: importance: 4
: broader: sync
: domain: Network

Term: Individual: p2p
: SetModel: Model Term
: definition: Peer-to-peer архитектура без центрального сервера
: synonym: P2P
: synonym: одноранговая сеть
: importance: 4
: domain: Network

# ========================================
# Application Concepts
# ========================================

Term: Individual: application
: SetModel: Model Term
: definition: Набор моделей и представлений для решения бизнес-задачи
: synonym: приложение
: synonym: app
: importance: 4
: domain: Workflow

Term: Individual: workflow
: SetModel: Model Term
: definition: Последовательность шагов бизнес-процесса
: synonym: бизнес-процесс
: importance: 4
: broader: application
: domain: Workflow

Term: Individual: role
: SetModel: Model Term
: definition: Набор прав и ответственностей актора в организации
: synonym: роль
: importance: 4
: domain: Security

# ========================================
# Architecture Concepts
# ========================================

Term: Individual: no-code
: SetModel: Model Term
: definition: Подход к разработке приложений без традиционного программирования через визуальные интерфейсы
: synonym: визуальное программирование
: synonym: бескодовая разработка
: importance: 4
: domain: Architecture

Term: Individual: semantic-web
: SetModel: Model Term
: definition: Концепция расширения веба машиночитаемыми метаданными и онтологиями
: synonym: семантический веб
: synonym: Web 3.0
: importance: 4
: domain: Semantics

Term: Individual: ontology
: SetModel: Model Term
: definition: Формальное описание концептов и их отношений в предметной области
: synonym: онтология
: importance: 5
: domain: Semantics

Term: Individual: knowledge-graph
: SetModel: Model Term
: definition: Структура данных представляющая знания в виде графа сущностей и связей
: synonym: граф знаний
: importance: 5
: related: event_graph
: domain: Semantics
