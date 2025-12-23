# Полный классификатор boldsea
# Версия: 1.0

# ========================================
# Определения концептов
# ========================================

Concept: Instance: Classifier
Concept: Instance: Category

# ========================================
# Определения моделей
# ========================================

Classifier: Model: Model Classifier
: Attribute: definition
:: DataType: Text
:: Required: 1

Category: Model: Model Category
: Relation: classifier
:: Range: Classifier
:: Required: 1
: Attribute: description
:: DataType: Text

# ========================================
# Классификаторы и категории
# ========================================

# Component
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

# Solution
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

# Audience
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

# Level
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

# Difficulty
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

# Detailing
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

# Functional purpose
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

# Industry
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

# Data
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

# Architecture
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

# Application
Classifier: Individual: Application
: SetModel: Model Classifier
: definition: Классификация по масштабу применения

Category: Individual: Personal
: SetModel: Model Category
: classifier: Application
: description: Персональное использование

Category: Individual: Team
: SetModel: Model Category
: classifier: Application
: description: Командная работа

Category: Individual: Departmental
: SetModel: Model Category
: classifier: Application
: description: Уровень подразделения

Category: Individual: Enterprise
: SetModel: Model Category
: classifier: Application
: description: Корпоративный уровень

Category: Individual: Inter Organizational
: SetModel: Model Category
: classifier: Application
: description: Межорганизационное взаимодействие

Category: Individual: Ecosystem
: SetModel: Model Category
: classifier: Application
: description: Экосистемный уровень

Category: Individual: Global
: SetModel: Model Category
: classifier: Application
: description: Глобальное применение

# Actor
Classifier: Individual: Actor
: SetModel: Model Classifier
: definition: Классификация по типам акторов

Category: Individual: Passive Observer
: SetModel: Model Category
: classifier: Actor
: description: Пассивный наблюдатель

Category: Individual: Active Reader
: SetModel: Model Category
: classifier: Actor
: description: Активный читатель

Category: Individual: Interactive User
: SetModel: Model Category
: classifier: Actor
: description: Интерактивный пользователь

Category: Individual: Content Creator
: SetModel: Model Category
: classifier: Actor
: description: Создатель контента

Category: Individual: Process Participant
: SetModel: Model Category
: classifier: Actor
: description: Участник процесса

Category: Individual: System Administrator
: SetModel: Model Category
: classifier: Actor
: description: Системный администратор

Category: Individual: Network Validator
: SetModel: Model Category
: classifier: Actor
: description: Валидатор сети

Category: Individual: Ecosystem Governor
: SetModel: Model Category
: classifier: Actor
: description: Управляющий экосистемой

# Stage
Classifier: Individual: Stage
: SetModel: Model Classifier
: definition: Классификация по стадии развития

Category: Individual: Concept
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

# Temporary
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

# Innovation
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

# Economic
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

# Competition
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

# Information
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

# Content
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

# Abstractness
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

# Innovativeness
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

# Impact
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

# Relevance
Classifier: Individual: Relevance
: SetModel: Model Classifier
: definition: Классификация по актуальности материалов

Category: Individual: Current
: SetModel: Model Category
: classifier: Relevance
: description: Текущие актуальные материалы

Category: Individual: Legacy
: SetModel: Model Category
: classifier: Relevance
: description: Устаревшие материалы

Category: Individual: Experimental
: SetModel: Model Category
: classifier: Relevance
: description: Экспериментальные материалы

# Source
Classifier: Individual: Source
: SetModel: Model Classifier
: definition: Классификация по источникам информации

Category: Individual: Official Documentation
: SetModel: Model Category
: classifier: Source
: description: Официальная документация

Category: Individual: Patent
: SetModel: Model Category
: classifier: Source
: description: Патентные материалы

Category: Individual: Research Paper
: SetModel: Model Category
: classifier: Source
: description: Исследовательские публикации

Category: Individual: Implementation Guide Source
: SetModel: Model Category
: classifier: Source
: description: Руководства по реализации
