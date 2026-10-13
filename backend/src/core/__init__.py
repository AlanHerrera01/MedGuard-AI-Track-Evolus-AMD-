"""Capa de dominio y orquestación agéntica de MedGuard AI.

No debe depender de FastAPI ni del transporte HTTP. Los servicios
externos se inyectan como dependencias.
"""

from src.core.orchestrator import ClinicalOrchestrator

__all__ = ["ClinicalOrchestrator"]
