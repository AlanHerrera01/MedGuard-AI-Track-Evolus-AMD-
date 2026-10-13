"""Clientes de integración con servicios externos.

Los adaptadores encapsulan el acceso HTTP y aíslan al dominio de los
detalles de red, autenticación y serialización.
"""

from src.services.amd_client import AMDClient
from src.services.evolus_client import EvolusClient

__all__ = ["AMDClient", "EvolusClient"]
