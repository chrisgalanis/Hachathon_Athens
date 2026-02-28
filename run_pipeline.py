"""Quick test: run the full pipeline on one processed JSON."""

import asyncio
import sys
from backend.agents.pipeline import VideoGenerationPipeline

JSON_PATHS = [
    "backend/scraper/processed/Linear_Algebra/Column_space_and_nullspace/6/processed.json",
    "backend/scraper/processed/Linear_Algebra/Complex_matrices_fast_fourier_transform/26/processed.json",
    "backend/scraper/processed/Linear_Algebra/Cramers_rule_inverse_matrix_and_volume/20/processed.json",
    "backend/scraper/processed/Linear_Algebra/Determinant_formulas_and_cofactors/19/processed.json",
    "backend/scraper/processed/Linear_Algebra/Diagonalization_and_powers_of_A/22/processed.json",
    "backend/scraper/processed/Linear_Algebra/Differential_equations_and_expAt/23/processed.json",
    "backend/scraper/processed/Linear_Algebra/Eigenvalues_and_eigenvectors/21/processed.json",
    "backend/scraper/processed/Linear_Algebra/Elimination_with_matrices/2/processed.json",
    "backend/scraper/processed/Linear_Algebra/Factorization_into_A__LU/4/processed.json",
    "backend/scraper/processed/Linear_Algebra/Final_course_review/34/processed.json",
    "backend/scraper/processed/Linear_Algebra/Graphs_networks_incidence_matrices/12/processed.json",
    "backend/scraper/processed/Linear_Algebra/Independence_basis_and_dimension/9/processed.json",
    "backend/scraper/processed/Linear_Algebra/Left_and_right_inverses_pseudoinverse/33/processed.json",
    "backend/scraper/processed/Linear_Algebra/Linear_transformations_and_their_matrices/30/processed.json",
    "backend/scraper/processed/Linear_Algebra/Markov_matrices_fourier_series/24/processed.json",
    "backend/scraper/processed/Linear_Algebra/Matrix_spaces_rank_1_small_world_graphs/11/processed.json",
    "backend/scraper/processed/Linear_Algebra/Multiplication_and_inverse_matrices/3/processed.json",
    "backend/scraper/processed/Linear_Algebra/Orthogonal_matrices_and_Gram-Schmidt/17/processed.json",
    "backend/scraper/processed/Linear_Algebra/Orthogonal_vectors_and_subspaces/14/processed.json",
    "backend/scraper/processed/Linear_Algebra/Positive_definite_matrices_and_minima/27/processed.json",
]


async def main():
    pipeline = VideoGenerationPipeline(output_dir="output")
    for json_path in JSON_PATHS:
        print(f"\n--- Processing: {json_path} ---")
        concept_mp4, example_mp4 = await pipeline.run_from_json(json_path)
        print("✓ Concept reel:", concept_mp4)
        print("✓ Example reel:", example_mp4)


if __name__ == "__main__":
    asyncio.run(main())
