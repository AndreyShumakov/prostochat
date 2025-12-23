# Prostochat Bootstrap - Models, Applications, Classifiers and Categories
# Loaded automatically at startup after genesis

# ========================================
# BASE CONCEPTS
# ========================================
Concept: Instance: Person
Concept: Instance: Task
Concept: Instance: Note
Concept: Instance: Schema
Concept: Instance: SchemaInstruction

# ========================================
# MODEL: Person
# ========================================
Person: Model: Model Person
: Attribute: name
:: Required: 1
:: DataType: BasicType
: Attribute: email
:: DataType: BasicType
: Attribute: phone
:: DataType: BasicType
: Attribute: age
:: DataType: Numeric
: Relation: organization
:: Range: Organization

# ========================================
# MODEL: Task
# ========================================
Task: Model: Model Task
: Attribute: title
:: Required: 1
:: DataType: BasicType
: Attribute: description
:: DataType: TextType
: Attribute: priority
:: DataType: EnumType
:: SetRange: low, medium, high
:: Default: medium
: Attribute: status
:: DataType: EnumType
:: SetRange: todo, in_progress, done
:: Default: todo
: Attribute: due_date
:: DataType: DateTime
: Relation: assignee
:: Range: Person

# ========================================
# MODEL: Note
# ========================================
Note: Model: Model Note
: Attribute: title
:: Required: 1
:: DataType: BasicType
: Attribute: content
:: DataType: TextType
: Attribute: tags
:: DataType: BasicType
:: Multiple: 1

# ========================================
# MODEL: SchemaInstruction
# ========================================
SchemaInstruction: Model: Model SchemaInstruction
: Attribute: target_schema
:: Required: 1
:: DataType: BasicType
:: description: Target schema model for extraction
: Attribute: llm_prompt_template
:: Required: 1
:: DataType: TextType
:: description: LLM prompt template for extraction
: Attribute: extraction_fields
:: Required: 1
:: DataType: BasicType
:: description: Comma-separated list of fields to extract
: Attribute: priority
:: DataType: Numeric
:: Default: 2
:: description: Priority for extraction order (1=high, 3=low)

# ========================================
# SAMPLE APPLICATIONS (with Models relation)
# ========================================
# Application содержит список моделей через отношение Models
# При запуске - если одна модель, открыть форму; если несколько - показать выбор

Application: Individual: task_app
: SetModel: Model_Application
: Title: Task Manager
: Icon: ✅
: Description: Create and manage tasks
: Models: Model Task

Application: Individual: person_app
: SetModel: Model_Application
: Title: Contacts
: Icon: 👤
: Description: Manage contacts
: Models: Model Person

Application: Individual: note_app
: SetModel: Model_Application
: Title: Notes
: Icon: 📝
: Description: Create notes
: Models: Model Note

# Пример приложения с несколькими моделями
Application: Individual: hr_app
: SetModel: Model_Application
: Title: HR Manager
: Icon: 👥
: Description: Human resources management
: Models: Model Person
: Models: Model Task

# ========================================
# Component Classifier
# ========================================
Classifier: Individual: Component
: SetModel: Model Classifier
: definition: Классификация по технологическим компонентам системы boldsea

Category: Individual: Engine
: SetModel: Model Category
: classifier: Component
: description: Семантический движок и его компоненты

Category: Individual: Network
: SetModel: Model Category
: classifier: Component
: description: P2P сеть, консенсус, распределенность

Category: Individual: UI
: SetModel: Model Category
: classifier: Component
: description: Интерфейсы и пользовательский опыт

Category: Individual: Storage
: SetModel: Model Category
: classifier: Component
: description: Хранилища данных, граф знаний

Category: Individual: Security
: SetModel: Model Category
: classifier: Component
: description: Безопасность и криптография

Category: Individual: Integration
: SetModel: Model Category
: classifier: Component
: description: Интеграция с внешними системами

Category: Individual: AI
: SetModel: Model Category
: classifier: Component
: description: Интеграция с LLM и AI

Category: Individual: Workflow
: SetModel: Model Category
: classifier: Component
: description: Моделирование бизнес-процессов

Category: Individual: Semantics
: SetModel: Model Category
: classifier: Component
: description: Семантические технологии

Category: Individual: API
: SetModel: Model Category
: classifier: Component
: description: API и программные интерфейсы

# ========================================
# Solution Classifier
# ========================================
Classifier: Individual: Solution
: SetModel: Model Classifier
: definition: Классификация по типам решаемых задач

Category: Individual: Business Process
: SetModel: Model Category
: classifier: Solution
: description: Бизнес-процессы

Category: Individual: Document Management
: SetModel: Model Category
: classifier: Solution
: description: Документооборот

Category: Individual: Knowledge Management
: SetModel: Model Category
: classifier: Solution
: description: Управление знаниями

Category: Individual: Data Integration
: SetModel: Model Category
: classifier: Solution
: description: Интеграция данных

Category: Individual: Automation
: SetModel: Model Category
: classifier: Solution
: description: Автоматизация

Category: Individual: Compliance
: SetModel: Model Category
: classifier: Solution
: description: Соответствие требованиям

Category: Individual: Scalability
: SetModel: Model Category
: classifier: Solution
: description: Масштабируемость

Category: Individual: Flexibility
: SetModel: Model Category
: classifier: Solution
: description: Гибкость систем

# ========================================
# Audience Classifier
# ========================================
Classifier: Individual: Audience
: SetModel: Model Classifier
: definition: Классификация по целевой аудитории

Category: Individual: Business Executives
: SetModel: Model Category
: classifier: Audience
: description: Руководители, принимающие решения

Category: Individual: Investors
: SetModel: Model Category
: classifier: Audience
: description: Инвесторы, венчурные фонды

Category: Individual: Business Analysts
: SetModel: Model Category
: classifier: Audience
: description: Бизнес-аналитики, функциональные консультанты

Category: Individual: Technical Analysts
: SetModel: Model Category
: classifier: Audience
: description: Системные аналитики, архитекторы

Category: Individual: Developers
: SetModel: Model Category
: classifier: Audience
: description: Разработчики, программисты

Category: Individual: Researchers
: SetModel: Model Category
: classifier: Audience
: description: Исследователи, академические круги

Category: Individual: End Users
: SetModel: Model Category
: classifier: Audience
: description: Конечные пользователи системы

Category: Individual: Integrators
: SetModel: Model Category
: classifier: Audience
: description: Системные интеграторы, консультанты по внедрению

# ========================================
# Level Classifier
# ========================================
Classifier: Individual: Level
: SetModel: Model Classifier
: definition: Классификация по уровню представления информации

Category: Individual: General
: SetModel: Model Category
: classifier: Level
: description: Общие разъяснения доступные всем

Category: Individual: Domain Specific
: SetModel: Model Category
: classifier: Level
: description: Предметно-ориентированные объяснения

Category: Individual: Technical
: SetModel: Model Category
: classifier: Level
: description: Технические детали для специалистов

Category: Individual: Implementation
: SetModel: Model Category
: classifier: Level
: description: Детали реализации и внедрения

Category: Individual: Theoretical
: SetModel: Model Category
: classifier: Level
: description: Теоретические основы и концепции

Category: Individual: Philosophical Foundation
: SetModel: Model Category
: classifier: Level
: description: Философские основы

# ========================================
# Difficulty Classifier
# ========================================
Classifier: Individual: Difficulty
: SetModel: Model Classifier
: definition: Классификация по уровню сложности материала

Category: Individual: Basic
: SetModel: Model Category
: classifier: Difficulty
: description: Основные понятия, простые определения

Category: Individual: Intermediate
: SetModel: Model Category
: classifier: Difficulty
: description: Детальные объяснения, примеры применения

Category: Individual: Advanced
: SetModel: Model Category
: classifier: Difficulty
: description: Глубокие технические детали, архитектурные решения

Category: Individual: Expert
: SetModel: Model Category
: classifier: Difficulty
: description: Специализированные знания, внутренние механизмы

# ========================================
# Detailing Classifier
# ========================================
Classifier: Individual: Detailing
: SetModel: Model Classifier
: definition: Классификация по степени детализации

Category: Individual: Overview
: SetModel: Model Category
: classifier: Detailing
: description: Общий обзор

Category: Individual: Summary
: SetModel: Model Category
: classifier: Detailing
: description: Краткое изложение

Category: Individual: Detailed
: SetModel: Model Category
: classifier: Detailing
: description: Подробное описание

Category: Individual: Comprehensive
: SetModel: Model Category
: classifier: Detailing
: description: Исчерпывающее изложение

Category: Individual: Implementation Guide
: SetModel: Model Category
: classifier: Detailing
: description: Руководство по реализации

Category: Individual: Formal Specification
: SetModel: Model Category
: classifier: Detailing
: description: Формальная спецификация

Category: Individual: Deep Dive
: SetModel: Model Category
: classifier: Detailing
: description: Глубокий анализ

# ========================================
# Functional purpose Classifier
# ========================================
Classifier: Individual: Functional purpose
: SetModel: Model Classifier
: definition: Классификация по функциональному назначению

Category: Individual: Conceptual
: SetModel: Model Category
: classifier: Functional purpose
: description: Концептуальные основы технологии

Category: Individual: Architectural
: SetModel: Model Category
: classifier: Functional purpose
: description: Архитектурные решения

Category: Individual: Operational
: SetModel: Model Category
: classifier: Functional purpose
: description: Операционные аспекты

Category: Individual: Strategic
: SetModel: Model Category
: classifier: Functional purpose
: description: Стратегические вопросы

Category: Individual: Commercial
: SetModel: Model Category
: classifier: Functional purpose
: description: Коммерческие аспекты

Category: Individual: Legal
: SetModel: Model Category
: classifier: Functional purpose
: description: Правовые и патентные вопросы

Category: Individual: Educational
: SetModel: Model Category
: classifier: Functional purpose
: description: Обучающие материалы

Category: Individual: Promotional
: SetModel: Model Category
: classifier: Functional purpose
: description: Промо-материалы и презентации

# ========================================
# Industry Classifier
# ========================================
Classifier: Individual: Industry
: SetModel: Model Classifier
: definition: Классификация по отраслям применения

Category: Individual: Universal
: SetModel: Model Category
: classifier: Industry
: description: Универсальные решения

Category: Individual: Finance
: SetModel: Model Category
: classifier: Industry
: description: Финансовые услуги

Category: Individual: Healthcare
: SetModel: Model Category
: classifier: Industry
: description: Здравоохранение

Category: Individual: Legal Industry
: SetModel: Model Category
: classifier: Industry
: description: Юридические услуги

Category: Individual: Manufacturing
: SetModel: Model Category
: classifier: Industry
: description: Производство

Category: Individual: Government
: SetModel: Model Category
: classifier: Industry
: description: Государственный сектор

Category: Individual: Research
: SetModel: Model Category
: classifier: Industry
: description: Исследования и разработки

Category: Individual: Education
: SetModel: Model Category
: classifier: Industry
: description: Образование

Category: Individual: Retail
: SetModel: Model Category
: classifier: Industry
: description: Розничная торговля

# ========================================
# Data Classifier
# ========================================
Classifier: Individual: Data
: SetModel: Model Classifier
: definition: Классификация по типам данных

Category: Individual: Structured Data
: SetModel: Model Category
: classifier: Data
: description: Структурированные данные

Category: Individual: Unstructured Data
: SetModel: Model Category
: classifier: Data
: description: Неструктурированные данные

Category: Individual: Metadata
: SetModel: Model Category
: classifier: Data
: description: Метаданные

Category: Individual: Temporal Data
: SetModel: Model Category
: classifier: Data
: description: Темпоральные данные

Category: Individual: Semantic Data
: SetModel: Model Category
: classifier: Data
: description: Семантические данные

Category: Individual: Business Rules
: SetModel: Model Category
: classifier: Data
: description: Бизнес-правила

# ========================================
# Architecture Classifier
# ========================================
Classifier: Individual: Architecture
: SetModel: Model Classifier
: definition: Классификация по архитектурным подходам

Category: Individual: Event Driven
: SetModel: Model Category
: classifier: Architecture
: description: Событийно-ориентированные аспекты

Category: Individual: Semantic Modeling
: SetModel: Model Category
: classifier: Architecture
: description: Семантическое моделирование

Category: Individual: Dataflow
: SetModel: Model Category
: classifier: Architecture
: description: Dataflow-архитектура

Category: Individual: No Code
: SetModel: Model Category
: classifier: Architecture
: description: No-code подходы

Category: Individual: Blockchain
: SetModel: Model Category
: classifier: Architecture
: description: Блокчейн и распределенные технологии

Category: Individual: AI Integration
: SetModel: Model Category
: classifier: Architecture
: description: Интеграция с искусственным интеллектом

Category: Individual: Workflow Management
: SetModel: Model Category
: classifier: Architecture
: description: Управление workflow

# ========================================
# Application Scope Classifier
# ========================================
Classifier: Individual: Application Scope
: SetModel: Model Classifier
: definition: Классификация по масштабу применения

Category: Individual: Personal
: SetModel: Model Category
: classifier: Application Scope
: description: Персональное использование

Category: Individual: Team
: SetModel: Model Category
: classifier: Application Scope
: description: Командная работа

Category: Individual: Departmental
: SetModel: Model Category
: classifier: Application Scope
: description: Уровень подразделения

Category: Individual: Enterprise
: SetModel: Model Category
: classifier: Application Scope
: description: Корпоративный уровень

Category: Individual: Inter Organizational
: SetModel: Model Category
: classifier: Application Scope
: description: Межорганизационное взаимодействие

Category: Individual: Ecosystem
: SetModel: Model Category
: classifier: Application Scope
: description: Экосистемный уровень

Category: Individual: Global
: SetModel: Model Category
: classifier: Application Scope
: description: Глобальное применение

# ========================================
# Actor Type Classifier
# ========================================
Classifier: Individual: Actor Type
: SetModel: Model Classifier
: definition: Классификация по типам акторов

Category: Individual: Passive Observer
: SetModel: Model Category
: classifier: Actor Type
: description: Пассивный наблюдатель

Category: Individual: Active Reader
: SetModel: Model Category
: classifier: Actor Type
: description: Активный читатель

Category: Individual: Interactive User
: SetModel: Model Category
: classifier: Actor Type
: description: Интерактивный пользователь

Category: Individual: Content Creator
: SetModel: Model Category
: classifier: Actor Type
: description: Создатель контента

Category: Individual: Process Participant
: SetModel: Model Category
: classifier: Actor Type
: description: Участник процесса

Category: Individual: System Administrator
: SetModel: Model Category
: classifier: Actor Type
: description: Системный администратор

Category: Individual: Network Validator
: SetModel: Model Category
: classifier: Actor Type
: description: Валидатор сети

Category: Individual: Ecosystem Governor
: SetModel: Model Category
: classifier: Actor Type
: description: Управляющий экосистемой

# ========================================
# Stage Classifier
# ========================================
Classifier: Individual: Stage
: SetModel: Model Classifier
: definition: Классификация по стадии развития

Category: Individual: Concept Stage
: SetModel: Model Category
: classifier: Stage
: description: Концептуальная стадия

Category: Individual: Proof of Concept
: SetModel: Model Category
: classifier: Stage
: description: Proof of concept

Category: Individual: Prototype
: SetModel: Model Category
: classifier: Stage
: description: Прототип

Category: Individual: MVP
: SetModel: Model Category
: classifier: Stage
: description: Минимальный жизнеспособный продукт

Category: Individual: Alpha
: SetModel: Model Category
: classifier: Stage
: description: Альфа-версия

Category: Individual: Beta
: SetModel: Model Category
: classifier: Stage
: description: Бета-версия

Category: Individual: Production Ready
: SetModel: Model Category
: classifier: Stage
: description: Готово к производству

Category: Individual: Market Ready
: SetModel: Model Category
: classifier: Stage
: description: Готово к рынку

# ========================================
# Temporary Classifier
# ========================================
Classifier: Individual: Temporary
: SetModel: Model Classifier
: definition: Классификация по временной перспективе

Category: Individual: Past
: SetModel: Model Category
: classifier: Temporary
: description: Историческая ретроспектива

Category: Individual: Present
: SetModel: Model Category
: classifier: Temporary
: description: Текущее состояние

Category: Individual: Near Future
: SetModel: Model Category
: classifier: Temporary
: description: Ближайшие планы

Category: Individual: Long Term
: SetModel: Model Category
: classifier: Temporary
: description: Долгосрочная перспектива

# ========================================
# Innovation Classifier
# ========================================
Classifier: Individual: Innovation
: SetModel: Model Classifier
: definition: Классификация по типам инноваций

Category: Individual: Technological
: SetModel: Model Category
: classifier: Innovation
: description: Технологические инновации

Category: Individual: Architectural Innovation
: SetModel: Model Category
: classifier: Innovation
: description: Архитектурные инновации

Category: Individual: Methodological
: SetModel: Model Category
: classifier: Innovation
: description: Методологические инновации

Category: Individual: Business Model
: SetModel: Model Category
: classifier: Innovation
: description: Инновации в бизнес-модели

Category: Individual: User Experience
: SetModel: Model Category
: classifier: Innovation
: description: Инновации в пользовательском опыте

Category: Individual: Integration Innovation
: SetModel: Model Category
: classifier: Innovation
: description: Инновации в интеграции

# ========================================
# Economic Classifier
# ========================================
Classifier: Individual: Economic
: SetModel: Model Classifier
: definition: Классификация по экономическим моделям

Category: Individual: Licensing
: SetModel: Model Category
: classifier: Economic
: description: Лицензирование

Category: Individual: SaaS
: SetModel: Model Category
: classifier: Economic
: description: SaaS модель

Category: Individual: On Premise
: SetModel: Model Category
: classifier: Economic
: description: On-premise решения

Category: Individual: Open Source
: SetModel: Model Category
: classifier: Economic
: description: Открытый исходный код

Category: Individual: Consulting
: SetModel: Model Category
: classifier: Economic
: description: Консультационные услуги

Category: Individual: Marketplace
: SetModel: Model Category
: classifier: Economic
: description: Модель маркетплейса

Category: Individual: Token Economy
: SetModel: Model Category
: classifier: Economic
: description: Токен-экономика

# ========================================
# Competition Classifier
# ========================================
Classifier: Individual: Competition
: SetModel: Model Classifier
: definition: Классификация по конкурентным аспектам

Category: Individual: Unique Advantages
: SetModel: Model Category
: classifier: Competition
: description: Уникальные преимущества

Category: Individual: Market Differentiation
: SetModel: Model Category
: classifier: Competition
: description: Дифференциация на рынке

Category: Individual: Competitor Analysis
: SetModel: Model Category
: classifier: Competition
: description: Анализ конкурентов

Category: Individual: Market Positioning
: SetModel: Model Category
: classifier: Competition
: description: Позиционирование

Category: Individual: Value Proposition
: SetModel: Model Category
: classifier: Competition
: description: Ценностное предложение

Category: Individual: Technology Comparison
: SetModel: Model Category
: classifier: Competition
: description: Сравнение технологий

# ========================================
# Information Classifier
# ========================================
Classifier: Individual: Information
: SetModel: Model Classifier
: definition: Классификация по типам информации

Category: Individual: Factual
: SetModel: Model Category
: classifier: Information
: description: Фактическая информация

Category: Individual: Analytical
: SetModel: Model Category
: classifier: Information
: description: Аналитические материалы

Category: Individual: Comparative
: SetModel: Model Category
: classifier: Information
: description: Сравнительные данные

Category: Individual: Predictive
: SetModel: Model Category
: classifier: Information
: description: Прогнозы и планы

Category: Individual: Historical
: SetModel: Model Category
: classifier: Information
: description: Историческая информация

Category: Individual: Statistical
: SetModel: Model Category
: classifier: Information
: description: Статистические данные

Category: Individual: Testimonial
: SetModel: Model Category
: classifier: Information
: description: Отзывы и мнения

Category: Individual: Case Study
: SetModel: Model Category
: classifier: Information
: description: Кейсы и примеры

# ========================================
# Content Classifier
# ========================================
Classifier: Individual: Content
: SetModel: Model Classifier
: definition: Классификация по формату контента

Category: Individual: Narrative
: SetModel: Model Category
: classifier: Content
: description: Повествовательный формат

Category: Individual: List
: SetModel: Model Category
: classifier: Content
: description: Списки и перечисления

Category: Individual: Table
: SetModel: Model Category
: classifier: Content
: description: Табличные данные

Category: Individual: Diagram
: SetModel: Model Category
: classifier: Content
: description: Диаграммы и схемы

Category: Individual: Code
: SetModel: Model Category
: classifier: Content
: description: Код и технические примеры

Category: Individual: Dialogue
: SetModel: Model Category
: classifier: Content
: description: Диалоги и Q&A

Category: Individual: Bullet Points
: SetModel: Model Category
: classifier: Content
: description: Тезисы и ключевые моменты

Category: Individual: Formal Spec
: SetModel: Model Category
: classifier: Content
: description: Формальные спецификации

Category: Individual: Mathematical Notation
: SetModel: Model Category
: classifier: Content
: description: Математическая нотация

# ========================================
# Abstractness Classifier
# ========================================
Classifier: Individual: Abstractness
: SetModel: Model Classifier
: definition: Классификация по уровню абстракции

Category: Individual: Philosophical
: SetModel: Model Category
: classifier: Abstractness
: description: Философский уровень

Category: Individual: Conceptual Level
: SetModel: Model Category
: classifier: Abstractness
: description: Концептуальный уровень

Category: Individual: Logical
: SetModel: Model Category
: classifier: Abstractness
: description: Логический уровень

Category: Individual: Physical
: SetModel: Model Category
: classifier: Abstractness
: description: Физический уровень

Category: Individual: Implementation Level
: SetModel: Model Category
: classifier: Abstractness
: description: Уровень реализации

# ========================================
# Innovativeness Classifier
# ========================================
Classifier: Individual: Innovativeness
: SetModel: Model Classifier
: definition: Классификация по степени инновационности

Category: Individual: Conventional Practice
: SetModel: Model Category
: classifier: Innovativeness
: description: Общепринятые практики

Category: Individual: Best Practice
: SetModel: Model Category
: classifier: Innovativeness
: description: Лучшие практики

Category: Individual: Innovative Approach
: SetModel: Model Category
: classifier: Innovativeness
: description: Инновационные подходы

Category: Individual: Experimental Concept
: SetModel: Model Category
: classifier: Innovativeness
: description: Экспериментальные концепции

Category: Individual: Disruptive Innovation
: SetModel: Model Category
: classifier: Innovativeness
: description: Разрушительные инновации

Category: Individual: Paradigm Shift
: SetModel: Model Category
: classifier: Innovativeness
: description: Смена парадигм

# ========================================
# Impact Classifier
# ========================================
Classifier: Individual: Impact
: SetModel: Model Classifier
: definition: Классификация по типу воздействия

Category: Individual: Disruptive
: SetModel: Model Category
: classifier: Impact
: description: Разрушительное влияние

Category: Individual: Evolutionary
: SetModel: Model Category
: classifier: Impact
: description: Эволюционное развитие

Category: Individual: Complementary
: SetModel: Model Category
: classifier: Impact
: description: Дополняющие решения

Category: Individual: Replacement
: SetModel: Model Category
: classifier: Impact
: description: Замещение существующих решений

Category: Individual: Enabling
: SetModel: Model Category
: classifier: Impact
: description: Поддерживающие технологии

# ========================================
# Relevance Classifier
# ========================================
Classifier: Individual: Relevance
: SetModel: Model Classifier
: definition: Классификация по актуальности

Category: Individual: Current
: SetModel: Model Category
: classifier: Relevance
: description: Актуальное

Category: Individual: Legacy
: SetModel: Model Category
: classifier: Relevance
: description: Устаревшее

Category: Individual: Experimental
: SetModel: Model Category
: classifier: Relevance
: description: Экспериментальное

# ========================================
# Source Classifier
# ========================================
Classifier: Individual: Source
: SetModel: Model Classifier
: definition: Классификация по источнику

Category: Individual: Official Documentation
: SetModel: Model Category
: classifier: Source
: description: Официальная документация

Category: Individual: Patent
: SetModel: Model Category
: classifier: Source
: description: Патент

Category: Individual: Research Paper
: SetModel: Model Category
: classifier: Source
: description: Научная статья

Category: Individual: Implementation Guide Source
: SetModel: Model Category
: classifier: Source
: description: Руководство по реализации
